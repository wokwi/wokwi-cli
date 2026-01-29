import type { LintIssue } from '../types.js';
import { parseEndpoint } from '../utils/connection-parser.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

// Part types that typically don't need connections
const EXCLUDED_TYPES = [
  'wokwi-text',
  'wokwi-logo',
  'wokwi-ir-remote', // IR remote sends signals wirelessly
];

/**
 * Rule: Detects parts with no connections (potentially redundant)
 */
export const redundantPartsRule: LintRule = {
  id: 'redundant-parts',
  name: 'Redundant Parts',
  description: 'Checks for parts that have no connections (excluding boards)',
  defaultSeverity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    // Build a set of all part IDs that are referenced in connections
    const connectedPartIds = new Set<string>();
    for (const [source, target] of ctx.diagram.connections) {
      connectedPartIds.add(parseEndpoint(source).partId);
      connectedPartIds.add(parseEndpoint(target).partId);
    }

    for (const part of ctx.diagram.parts) {
      // Skip boards - they are the main MCU and may have internal connections
      if (ctx.registry.isBoard(part.type)) {
        continue;
      }

      // Skip excluded types
      if (EXCLUDED_TYPES.includes(part.type)) {
        continue;
      }

      // Skip custom chips (they may have internal behavior)
      if (ctx.registry.isCustomChip(part.type)) {
        continue;
      }

      // Check if this part has any connections
      if (!connectedPartIds.has(part.id)) {
        issues.push(
          createIssue(this, `Part "${part.id}" (type: ${part.type}) has no connections`, {
            partId: part.id,
            context: { partType: part.type },
          }),
        );
      }
    }

    return issues;
  },
};
