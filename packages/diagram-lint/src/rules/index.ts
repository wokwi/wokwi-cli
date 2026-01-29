export { createIssue } from './rule.js';
export type { LintContext, LintRule } from './rule.js';

export { duplicateIdRule } from './duplicate-id.js';
export { invalidAttributeRule } from './invalid-attribute.js';
export { invalidPinRule } from './invalid-pin.js';
export { misplacedCoordsRule } from './misplaced-coords.js';
export { missingComponentRule } from './missing-component.js';
export { redundantPartsRule } from './redundant-parts.js';
export { unknownPartTypeRule } from './unknown-part-type.js';
export { unsupportedPartRule } from './unsupported-part.js';
export { wrongCoordNamesRule } from './wrong-coord-names.js';

import { duplicateIdRule } from './duplicate-id.js';
import { invalidAttributeRule } from './invalid-attribute.js';
import { invalidPinRule } from './invalid-pin.js';
import { misplacedCoordsRule } from './misplaced-coords.js';
import { missingComponentRule } from './missing-component.js';
import { redundantPartsRule } from './redundant-parts.js';
import type { LintRule } from './rule.js';
import { unknownPartTypeRule } from './unknown-part-type.js';
import { unsupportedPartRule } from './unsupported-part.js';
import { wrongCoordNamesRule } from './wrong-coord-names.js';

/**
 * All available lint rules
 */
export const allRules: LintRule[] = [
  duplicateIdRule,
  invalidPinRule,
  missingComponentRule,
  unknownPartTypeRule,
  invalidAttributeRule,
  misplacedCoordsRule,
  redundantPartsRule,
  wrongCoordNamesRule,
  unsupportedPartRule,
];
