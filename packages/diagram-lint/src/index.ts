// Main exports
export { DiagramLinter } from './linter.js';

// Types
export type {
  AttributeDefinition,
  BoardBundle,
  BoardBundleEntry,
  Connection,
  Diagram,
  LintIssue,
  LintResult,
  LintSeverity,
  LinterOptions,
  Part,
  PartDefinition,
  RuleConfig,
  SerialMonitorConfig,
} from './types.js';

// Registry
export { partDefinitions } from './registry/part-definitions.js';
export { PartRegistry } from './registry/part-registry.js';

// Rules
export {
  allRules,
  duplicateIdRule,
  invalidAttributeRule,
  invalidPinRule,
  misplacedCoordsRule,
  missingComponentRule,
  redundantPartsRule,
  unknownPartTypeRule,
  unsupportedPartRule,
  wrongCoordNamesRule,
} from './rules/index.js';
export { createIssue } from './rules/rule.js';
export type { LintContext, LintRule } from './rules/rule.js';
