import type { LintIssue } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Warns about parts that exist but are not officially documented
 */
export const unsupportedPartRule: LintRule = {
  id: 'unsupported-part',
  name: 'Unsupported Part',
  description: 'Warns about parts that are not in the official documentation',
  defaultSeverity: 'info',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (const part of ctx.diagram.parts) {
      // Skip unknown parts (handled by unknown-part-type rule)
      if (!ctx.registry.has(part.type)) {
        continue;
      }

      // Skip custom chips and boards
      if (ctx.registry.isCustomChip(part.type) || ctx.registry.isCustomBoard(part.type)) {
        continue;
      }

      // Check if the part is documented
      if (!ctx.registry.isDocumented(part.type)) {
        issues.push(
          createIssue(
            this,
            `Part "${part.id}" uses undocumented type "${part.type}". This part may change or be removed in future versions.`,
            {
              partId: part.id,
              context: { partType: part.type },
            },
          ),
        );
      }
    }

    return issues;
  },
};
