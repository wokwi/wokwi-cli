import type { LintIssue } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

const COORD_ATTRS = ['top', 'left', 'rotate'] as const;

/**
 * Rule: Detects coordinates placed in attrs instead of at part level
 */
export const misplacedCoordsRule: LintRule = {
  id: 'misplaced-coords',
  name: 'Misplaced Coordinates',
  description: 'Checks for "top", "left", or "rotate" in attrs instead of at the part level',
  defaultSeverity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (const part of ctx.diagram.parts) {
      if (!part.attrs) continue;

      for (const coordAttr of COORD_ATTRS) {
        if (coordAttr in part.attrs) {
          issues.push(
            createIssue(
              this,
              `"${coordAttr}" should be a property of the part, not in "attrs". Move it outside of attrs.`,
              {
                partId: part.id,
                context: { attr: coordAttr, value: part.attrs[coordAttr] },
              },
            ),
          );
        }
      }
    }

    return issues;
  },
};
