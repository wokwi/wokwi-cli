/**
 * Wokwi Diagram types - compatible with the diagram.json format
 */

export interface Diagram {
  version: number;
  author?: string;
  editor?: string;
  parts: Part[];
  connections: Connection[];
  serialMonitor?: SerialMonitorConfig;
  dependencies?: Record<string, string>;
}

export interface Part {
  type: string;
  id: string;
  top?: number;
  left?: number;
  rotate?: number;
  attrs?: Record<string, string>;
}

/**
 * Connection format: [source, target, color, path]
 * - source: "partId:pinName" (e.g., "uno:13", "led1:A")
 * - target: "partId:pinName" (e.g., "led1:C", "uno:GND")
 * - color: wire color (e.g., "green", "red", "black")
 * - path: array of path segments for wire routing (e.g., ["v0"], ["h100", "v-50"])
 */
export type Connection = [string, string, string, string[]];

export interface SerialMonitorConfig {
  display?: 'never' | 'always' | 'auto' | 'plotter' | 'terminal';
  newline?: 'none' | 'cr' | 'lf' | 'crlf';
  convertEol?: boolean;
}

/**
 * Lint severity levels
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * A single lint issue found in the diagram
 */
export interface LintIssue {
  /** Unique rule identifier */
  rule: string;
  /** Severity level */
  severity: LintSeverity;
  /** Human-readable message describing the issue */
  message: string;
  /** Part ID where the issue was found (if applicable) */
  partId?: string;
  /** Connection index where the issue was found (if applicable) */
  connectionIndex?: number;
  /** Additional context about the issue */
  context?: Record<string, unknown>;
}

/**
 * Result of linting a diagram
 */
export interface LintResult {
  /** Whether the diagram is valid (no errors) */
  valid: boolean;
  /** All issues found */
  issues: LintIssue[];
  /** Summary statistics */
  stats: {
    errors: number;
    warnings: number;
    infos: number;
    total: number;
  };
}

/**
 * Configuration for a lint rule
 */
export interface RuleConfig {
  /** Whether the rule is enabled */
  enabled?: boolean;
  /** Override the default severity */
  severity?: LintSeverity;
}

/**
 * Linter options
 */
export interface LinterOptions {
  /** Rule-specific configuration */
  rules?: Record<string, RuleConfig | boolean>;
}

/**
 * Definition for a part attribute
 */
export interface AttributeDefinition {
  /** Attribute name */
  name: string;
  /** Expected type */
  type?: 'string' | 'number' | 'boolean';
  /** Valid values (for enum-like attributes) */
  validValues?: string[];
  /** Description */
  description?: string;
}

/**
 * Definition of a part type
 */
export interface PartDefinition {
  /** Part type name (e.g., "wokwi-led") */
  type: string;
  /** Pin names for this part */
  pins: string[];
  /** Known attributes for this part */
  attrs?: AttributeDefinition[];
  /** Whether this part is officially documented */
  documented: boolean;
  /** Whether this part is a board (main MCU) */
  isBoard?: boolean;
  /** Category for this part */
  category?: string;
}

/**
 * Board definition from wokwi-boards bundle.json
 */
export interface BoardBundleEntry {
  rev: string;
  def: {
    name: string;
    pins: Record<string, { x: number; y: number; target?: string }>;
    [key: string]: unknown;
  };
}

/**
 * wokwi-boards bundle.json format
 */
export type BoardBundle = Record<string, BoardBundleEntry>;
