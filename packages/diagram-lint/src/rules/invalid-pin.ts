import type { LintIssue } from '../types.js';
import { parseEndpoint } from '../utils/connection-parser.js';
import type { LintContext, LintRule } from './rule.js';
import { createIssue } from './rule.js';

/**
 * Check if a part type is a breadboard
 */
function isBreadboard(type: string): boolean {
  return type.startsWith('wokwi-breadboard');
}

/**
 * Validate a breadboard pin.
 * Valid patterns:
 * - Row pins: {column}{row}.{letter} e.g., "5t.a", "12b.j" (columns 1-63, t/b, letters a-j)
 * - Power rails: {rail}.{number} e.g., "tp.1", "bn.45" (tp/tn/bp/bn, numbers 1-50)
 */
function isValidBreadboardPin(pin: string): boolean {
  // Row pin: 1-63 + t/b + . + a-j
  const rowPinPattern = /^([1-9]|[1-5][0-9]|6[0-3])[tb]\.[a-j]$/;
  // Power rail: tp/tn/bp/bn + . + 1-50
  const powerRailPattern = /^[tb][pn]\.([1-9]|[1-4][0-9]|50)$/;

  return rowPinPattern.test(pin) || powerRailPattern.test(pin);
}

/**
 * Rule: Detects invalid pin names in connections
 */
export const invalidPinRule: LintRule = {
  id: 'invalid-pin',
  name: 'Invalid Pin',
  description: 'Checks for connections using non-existent pins',
  defaultSeverity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (let i = 0; i < ctx.diagram.connections.length; i++) {
      const [source, target] = ctx.diagram.connections[i];
      const { partId: sourcePartId, pin: sourcePin } = parseEndpoint(source);
      const { partId: targetPartId, pin: targetPin } = parseEndpoint(target);

      // Get the part types
      const sourcePart = ctx.diagram.parts.find((p) => p.id === sourcePartId);
      const targetPart = ctx.diagram.parts.find((p) => p.id === targetPartId);

      // Check source pin
      if (sourcePart && sourcePin) {
        // Skip validation for custom chips
        if (!ctx.registry.isCustomChip(sourcePart.type)) {
          // Breadboards have special dynamic pin naming
          if (isBreadboard(sourcePart.type)) {
            if (!isValidBreadboardPin(sourcePin)) {
              issues.push(
                createIssue(
                  this,
                  `Invalid breadboard pin "${sourcePin}" for part "${sourcePartId}". Expected format: row (e.g., "5t.a") or power rail (e.g., "tp.1")`,
                  {
                    connectionIndex: i,
                    partId: sourcePartId,
                    context: { pin: sourcePin, partType: sourcePart.type },
                  },
                ),
              );
            }
          } else if (
            ctx.registry.has(sourcePart.type) &&
            !ctx.registry.isValidPin(sourcePart.type, sourcePin)
          ) {
            const validPins = ctx.registry.getPins(sourcePart.type);
            issues.push(
              createIssue(
                this,
                `Invalid pin "${sourcePin}" for part "${sourcePartId}" (type: ${sourcePart.type}). Valid pins: ${validPins.join(', ') || 'none'}`,
                {
                  connectionIndex: i,
                  partId: sourcePartId,
                  context: { pin: sourcePin, partType: sourcePart.type, validPins },
                },
              ),
            );
          }
        }
      }

      // Check target pin
      if (targetPart && targetPin) {
        // Skip validation for custom chips
        if (!ctx.registry.isCustomChip(targetPart.type)) {
          // Breadboards have special dynamic pin naming
          if (isBreadboard(targetPart.type)) {
            if (!isValidBreadboardPin(targetPin)) {
              issues.push(
                createIssue(
                  this,
                  `Invalid breadboard pin "${targetPin}" for part "${targetPartId}". Expected format: row (e.g., "5t.a") or power rail (e.g., "tp.1")`,
                  {
                    connectionIndex: i,
                    partId: targetPartId,
                    context: { pin: targetPin, partType: targetPart.type },
                  },
                ),
              );
            }
          } else if (
            ctx.registry.has(targetPart.type) &&
            !ctx.registry.isValidPin(targetPart.type, targetPin)
          ) {
            const validPins = ctx.registry.getPins(targetPart.type);
            issues.push(
              createIssue(
                this,
                `Invalid pin "${targetPin}" for part "${targetPartId}" (type: ${targetPart.type}). Valid pins: ${validPins.join(', ') || 'none'}`,
                {
                  connectionIndex: i,
                  partId: targetPartId,
                  context: { pin: targetPin, partType: targetPart.type, validPins },
                },
              ),
            );
          }
        }
      }
    }

    return issues;
  },
};
