import type { LintIssue } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Detects duplicate part IDs in the diagram
 */
export const duplicateIdRule: LintRule = {
  id: 'duplicate-id',
  name: 'Duplicate Part ID',
  description: 'Checks for parts with duplicate IDs',
  defaultSeverity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];
    const seenIds = new Map<string, number>();

    for (let i = 0; i < ctx.diagram.parts.length; i++) {
      const part = ctx.diagram.parts[i];
      const existingIndex = seenIds.get(part.id);

      if (existingIndex !== undefined) {
        issues.push(
          createIssue(
            this,
            `Duplicate part ID "${part.id}" (first occurrence at index ${existingIndex})`,
            {
              partId: part.id,
              context: { firstIndex: existingIndex, secondIndex: i },
            },
          ),
        );
      } else {
        seenIds.set(part.id, i);
      }
    }

    return issues;
  },
};
