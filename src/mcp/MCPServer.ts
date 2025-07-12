import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { readVersion } from '../readVersion.js';
import { SimulationManager } from './SimulationManager.js';
import { WokwiMCPTools } from './WokwiMCPTools.js';
import { WokwiMCPResources } from './WokwiMCPResources.js';

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

  constructor(private readonly options: MCPServerOptions) {
    const { version } = readVersion();
    
    this.server = new McpServer({
      name: 'wokwi-cli',
      version,
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    });

    this.simulationManager = new SimulationManager(options.rootDir, options.token, options.quiet);
    this.tools = new WokwiMCPTools(this.simulationManager);
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    if (!this.options.quiet) {
      console.error('Wokwi MCP Server started');
    }
  }

  async stop() {
    await this.simulationManager.cleanup();
    await this.server.close();
  }
}