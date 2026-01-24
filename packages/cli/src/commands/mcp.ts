import type { Command } from 'commander';
import { WokwiMCPServer } from '../mcp/MCPServer.js';
import { requireToken } from '../utils/token.js';

interface McpOptions {
  quiet?: boolean;
}

export function mcpCommand(program: Command): void {
  program
    .command('mcp [path]')
    .description('Start MCP server for AI integration (experimental)')
    .option('-q, --quiet', 'Suppress status messages')
    .action(async (path: string | undefined, options: McpOptions) => {
      const token = requireToken();

      const rootDir = path ?? '.';
      const quiet = options.quiet ?? false;

      const mcpServer = new WokwiMCPServer({ rootDir, token, quiet });

      process.on('SIGINT', () => {
        void mcpServer.stop().then(() => {
          process.exit(0);
        });
      });

      process.on('SIGTERM', () => {
        void mcpServer.stop().then(() => {
          process.exit(0);
        });
      });

      await mcpServer.start();
    });
}
