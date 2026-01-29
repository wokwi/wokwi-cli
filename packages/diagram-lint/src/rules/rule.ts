import type { PartRegistry } from '../registry/part-registry.js';
import type { Diagram, LintIssue, LintSeverity } from '../types.js';

/**
 * Context passed to lint rules
 */
export interface LintContext {
  diagram: Diagram;
  registry: PartRegistry;
}

/**
 * Base interface for lint rules
 */
export interface LintRule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: LintSeverity;
  check(ctx: LintContext): LintIssue[];
}

/**
 * Helper function to create a lint issue
 */
export function createIssue(
  rule: LintRule,
  message: string,
  options?: {
    severity?: LintSeverity;
    partId?: string;
    connectionIndex?: number;
    context?: Record<string, unknown>;
  },
): LintIssue {
  return {
    rule: rule.id,
    severity: options?.severity ?? rule.defaultSeverity,
    message,
    partId: options?.partId,
    connectionIndex: options?.connectionIndex,
    context: options?.context,
  };
}
