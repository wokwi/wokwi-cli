import type { LintIssue, Part } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Detects use of "x"/"y" instead of "left"/"top"
 */
export const wrongCoordNamesRule: LintRule = {
  id: 'wrong-coord-names',
  name: 'Wrong Coordinate Names',
  description: 'Checks for "x" or "y" instead of "left" or "top"',
  defaultSeverity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (const part of ctx.diagram.parts) {
      // Check for 'x' property (TypeScript won't show it but it might exist in JSON)
      const partAny = part as Part & { x?: number; y?: number };

      if ('x' in partAny) {
        issues.push(
          createIssue(
            this,
            `Part "${part.id}" uses "x" instead of "left" for horizontal position`,
            {
              partId: part.id,
              context: { wrongProp: 'x', correctProp: 'left', value: partAny.x },
            },
          ),
        );
      }

      if ('y' in partAny) {
        issues.push(
          createIssue(this, `Part "${part.id}" uses "y" instead of "top" for vertical position`, {
            partId: part.id,
            context: { wrongProp: 'y', correctProp: 'top', value: partAny.y },
          }),
        );
      }

      // Also check in attrs
      if (part.attrs) {
        if ('x' in part.attrs) {
          issues.push(
            createIssue(
              this,
              `Part "${part.id}" has "x" in attrs instead of "left" at part level`,
              {
                partId: part.id,
                context: { wrongProp: 'x', correctProp: 'left', inAttrs: true },
              },
            ),
          );
        }

        if ('y' in part.attrs) {
          issues.push(
            createIssue(this, `Part "${part.id}" has "y" in attrs instead of "top" at part level`, {
              partId: part.id,
              context: { wrongProp: 'y', correctProp: 'top', inAttrs: true },
            }),
          );
        }
      }
    }

    return issues;
  },
};
