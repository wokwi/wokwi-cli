export interface Diagram {
  version: number;
  author?: string;
  editor?: string;
  parts: Part[];
  connections: Connection[];
  serialMonitor?: SerialMonitorConfig;
  dependencies: Record<string, string>;
}

export interface Part {
  type: string;
  id: string;
  top?: number;
  left?: number;
  rotate?: number;
  attrs?: Record<string, string>;
}

export type Connection = [string, string, string, string[]];

export interface SerialMonitorConfig {
  display?: 'never' | 'always' | 'auto' | 'plotter' | 'terminal';
  newline?: 'none' | 'cr' | 'lf' | 'crlf';
  convertEol?: boolean;
}
