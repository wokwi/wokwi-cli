import { PartRegistry } from './registry/part-registry.js';
import { allRules } from './rules/index.js';
import type { LintContext, LintRule } from './rules/rule.js';
import type { Diagram, LintResult, LintSeverity, LinterOptions, RuleConfig } from './types.js';

/**
 * Main linter class for validating Wokwi diagram.json files
 */
export class DiagramLinter {
  private registry: PartRegistry;
  private rules: LintRule[];
  private ruleConfigs: Map<string, RuleConfig>;

  constructor(options?: LinterOptions) {
    this.registry = new PartRegistry();
    this.rules = [...allRules];
    this.ruleConfigs = new Map();

    // Apply options
    if (options?.rules) {
      for (const [ruleId, config] of Object.entries(options.rules)) {
        if (typeof config === 'boolean') {
          this.ruleConfigs.set(ruleId, { enabled: config });
        } else {
          this.ruleConfigs.set(ruleId, config);
        }
      }
    }
  }

  lint(diagram: Diagram): LintResult {
    const issues: LintResult['issues'] = [];
    const ctx: LintContext = { diagram, registry: this.registry };

    // Run all enabled rules
    for (const rule of this.rules) {
      const config = this.ruleConfigs.get(rule.id);

      // Skip disabled rules
      if (config?.enabled === false) {
        continue;
      }

      // Get severity override
      const severityOverride = config?.severity;

      // Run the rule
      const ruleIssues = rule.check(ctx);

      // Apply severity override if configured
      for (const issue of ruleIssues) {
        if (severityOverride) {
          issue.severity = severityOverride;
        }
        issues.push(issue);
      }
    }

    // Calculate stats
    const stats = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      infos: issues.filter((i) => i.severity === 'info').length,
      total: issues.length,
    };

    return {
      valid: stats.errors === 0,
      issues,
      stats,
    };
  }

  /**
   * Lint a JSON string
   */
  lintJSON(json: string): LintResult {
    try {
      const diagram = JSON.parse(json) as Diagram;
      return this.lint(diagram);
    } catch (error) {
      // Return parse error as a lint issue
      return {
        valid: false,
        issues: [
          {
            rule: 'json-parse',
            severity: 'error',
            message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        stats: {
          errors: 1,
          warnings: 0,
          infos: 0,
          total: 1,
        },
      };
    }
  }

  /**
   * Get the part registry (for advanced use cases)
   */
  getRegistry(): PartRegistry {
    return this.registry;
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const existing = this.ruleConfigs.get(ruleId) ?? {};
    this.ruleConfigs.set(ruleId, { ...existing, enabled });
  }

  /**
   * Set the severity for a rule
   */
  setRuleSeverity(ruleId: string, severity: LintSeverity): void {
    const existing = this.ruleConfigs.get(ruleId) ?? {};
    this.ruleConfigs.set(ruleId, { ...existing, severity });
  }

  /**
   * Get all available rule IDs
   */
  getRuleIds(): string[] {
    return this.rules.map((r) => r.id);
  }

  /**
   * Get rule information by ID
   */
  getRule(ruleId: string): LintRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }
}
