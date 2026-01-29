import type { LintIssue } from '../types.js';
import { parseEndpoint } from '../utils/connection-parser.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Detects connections referencing non-existent parts
 */
export const missingComponentRule: LintRule = {
  id: 'missing-component',
  name: 'Missing Component',
  description: 'Checks for connections referencing parts that do not exist',
  defaultSeverity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];
    const partIds = new Set(ctx.diagram.parts.map((p) => p.id));

    // Add virtual $serialMonitor
    partIds.add('$serialMonitor');

    for (let i = 0; i < ctx.diagram.connections.length; i++) {
      const [source, target] = ctx.diagram.connections[i];
      const sourcePartId = parseEndpoint(source).partId;
      const targetPartId = parseEndpoint(target).partId;

      if (!partIds.has(sourcePartId)) {
        issues.push(
          createIssue(this, `Connection references non-existent part "${sourcePartId}"`, {
            connectionIndex: i,
            context: { missingPartId: sourcePartId, position: 'source' },
          }),
        );
      }

      if (!partIds.has(targetPartId)) {
        issues.push(
          createIssue(this, `Connection references non-existent part "${targetPartId}"`, {
            connectionIndex: i,
            context: { missingPartId: targetPartId, position: 'target' },
          }),
        );
      }
    }

    return issues;
  },
};
