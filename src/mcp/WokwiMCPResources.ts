import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export class WokwiMCPResources {
  constructor(private readonly rootDir: string) {}

  listResources(): Resource[] {
    const resources: Resource[] = [];

    const configPath = path.join(this.rootDir, 'wokwi.toml');
    if (existsSync(configPath)) {
      resources.push({
        uri: `file://${configPath}`,
        name: 'wokwi.toml',
        description: 'Wokwi project configuration file',
        mimeType: 'application/toml',
      });
    }

    const diagramPath = path.join(this.rootDir, 'diagram.json');
    if (existsSync(diagramPath)) {
      resources.push({
        uri: `file://${diagramPath}`,
        name: 'diagram.json',
        description: 'Wokwi circuit diagram definition',
        mimeType: 'application/json',
      });
    }

    return resources;
  }

  async readResource(
    uri: string,
  ): Promise<{ contents: Array<{ uri: string; text: string; mimeType?: string }> }> {
    if (!uri.startsWith('file://')) {
      throw new Error(`Unsupported URI scheme: ${uri}`);
    }

    const filePath = uri.replace('file://', '');

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Security check: ensure file is within the project directory
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(this.rootDir);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error(`Access denied: file outside project directory`);
    }

    const content = readFileSync(filePath, 'utf8');
    const mimeType = this.getMimeType(filePath);

    return {
      contents: [
        {
          uri,
          text: content,
          mimeType,
        },
      ],
    };
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.toml':
        return 'application/toml';
      case '.json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }
}
