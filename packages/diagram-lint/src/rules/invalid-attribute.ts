import type { LintIssue } from '../types.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Rule: Detects invalid or unknown attributes
 */
export const invalidAttributeRule: LintRule = {
  id: 'invalid-attribute',
  name: 'Invalid Attribute',
  description: 'Checks for unknown or invalid attribute names and values',
  defaultSeverity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (const part of ctx.diagram.parts) {
      if (!part.attrs) continue;

      // Skip validation for unknown or custom parts
      if (!ctx.registry.has(part.type) || ctx.registry.isCustomChip(part.type)) {
        continue;
      }

      const knownAttrs = ctx.registry.getAttributes(part.type);

      // If no attributes are defined for this part type, skip validation
      if (knownAttrs.length === 0) continue;

      for (const [attrName, attrValue] of Object.entries(part.attrs)) {
        const attrDef = knownAttrs.find((a) => a.name === attrName);

        if (!attrDef) {
          issues.push(
            createIssue(
              this,
              `Unknown attribute "${attrName}" for part "${part.id}" (type: ${part.type})`,
              {
                partId: part.id,
                context: {
                  attrName,
                  attrValue,
                  partType: part.type,
                  knownAttrs: knownAttrs.map((a) => a.name),
                },
              },
            ),
          );
        } else if (attrDef.validValues && !attrDef.validValues.includes(attrValue)) {
          issues.push(
            createIssue(
              this,
              `Invalid value "${attrValue}" for attribute "${attrName}" on part "${part.id}". Valid values: ${attrDef.validValues.join(', ')}`,
              {
                partId: part.id,
                context: {
                  attrName,
                  attrValue,
                  validValues: attrDef.validValues,
                },
              },
            ),
          );
        }
      }
    }

    return issues;
  },
};
