import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DiagramLinter, type LintResult } from '@wokwi/diagram-lint';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { readVersion } from '../readVersion.js';
import { SimulationManager } from './SimulationManager.js';
import { WokwiMCPResources } from './WokwiMCPResources.js';
import { WokwiMCPTools } from './WokwiMCPTools.js';

export interface MCPServerOptions {
  rootDir: string;
  token: string;
  quiet?: boolean;
}

export class WokwiMCPServer {
  private readonly server: McpServer;
  private readonly simulationManager: SimulationManager;
  private readonly tools: WokwiMCPTools;
  private readonly resources: WokwiMCPResources;
  private lintWarnings: LintResult | null = null;

  constructor(private readonly options: MCPServerOptions) {
    const { version } = readVersion();

    this.server = new McpServer(
      {
        name: 'wokwi-cli',
        version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.simulationManager = new SimulationManager(options.rootDir, options.token, options.quiet);
    this.tools = new WokwiMCPTools(this.simulationManager, {
      getLintWarnings: () => this.getLintWarnings(),
    });
    this.resources = new WokwiMCPResources(options.rootDir);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.tools.listTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.tools.callTool(request.params.name, request.params.arguments);
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: this.resources.listResources() };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await this.resources.readResource(request.params.uri);
    });
  }

  async start() {
    // Validate diagram before starting
    const diagramPath = path.join(this.options.rootDir, 'diagram.json');
    if (existsSync(diagramPath)) {
      const linter = new DiagramLinter();
      const diagram = readFileSync(diagramPath, 'utf8');
      const result = linter.lintJSON(diagram);

      if (result.stats.errors > 0) {
        const errorMessages = result.issues
          .filter((i) => i.severity === 'error')
          .map((i) => `[${i.rule}] ${i.message}`)
          .join('\n');
        throw new Error(`Diagram lint errors:\n${errorMessages}`);
      }

      // Store warnings to include in start_simulation response
      if (result.stats.warnings > 0) {
        this.lintWarnings = result;
      }
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (!this.options.quiet) {
      console.error('Wokwi MCP Server started');
    }
  }

  /**
   * Get lint warnings from startup validation
   */
  getLintWarnings(): LintResult | null {
    return this.lintWarnings;
  }

  async stop() {
    await this.simulationManager.cleanup();
    await this.server.close();
  }
}
