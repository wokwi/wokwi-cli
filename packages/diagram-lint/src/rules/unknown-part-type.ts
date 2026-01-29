import type { LintIssue } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Detects unknown part types
 */
export const unknownPartTypeRule: LintRule = {
  id: 'unknown-part-type',
  name: 'Unknown Part Type',
  description: 'Checks for parts with unrecognized types',
  defaultSeverity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (const part of ctx.diagram.parts) {
      // Skip custom chips and custom boards
      if (ctx.registry.isCustomChip(part.type) || ctx.registry.isCustomBoard(part.type)) {
        continue;
      }

      if (!ctx.registry.has(part.type)) {
        issues.push(
          createIssue(this, `Unknown part type "${part.type}" for part "${part.id}"`, {
            partId: part.id,
            context: { partType: part.type },
          }),
        );
      }
    }

    return issues;
  },
};
