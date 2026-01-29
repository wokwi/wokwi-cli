/**
 * Shared lint utilities for CLI commands
 */

import {
  REMOTE_BOARDS_URL,
  type BoardBundle,
  type LintIssue,
  type LintResult,
} from '@wokwi/diagram-lint';
import chalkTemplate from 'chalk-template';

export interface LintDisplayOptions {
  /** Only show errors, hide warnings and info */
  quiet?: boolean;
}

/**
 * Format a single lint issue for display
 */
export function formatLintIssue(issue: LintIssue): string {
  const icon =
    issue.severity === 'error' ? '\u2717' : issue.severity === 'warning' ? '\u26A0' : '\u2139';
  const color =
    issue.severity === 'error' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'gray';
  const location = issue.partId ? ` (${issue.partId})` : '';
  return chalkTemplate`{${color} ${icon} [${issue.rule}]} ${issue.message}${location}`;
}

/**
 * Display lint results to console
 */
export function displayLintResults(result: LintResult, options: LintDisplayOptions = {}): void {
  const { quiet = false } = options;

  // If quiet and no errors, don't show anything
  if (quiet && result.stats.errors === 0) {
    return;
  }

  for (const issue of result.issues) {
    // In quiet mode, only show errors
    if (quiet && issue.severity !== 'error') {
      continue;
    }
    console.error(formatLintIssue(issue));
  }
}

/**
 * Check if lint result has blocking errors
 *
 * @param result - The lint result
 * @param warningsAsErrors - If true, treat warnings as errors
 * @returns true if there are blocking errors (or warnings if warningsAsErrors is true)
 */
export function hasLintErrors(result: LintResult, warningsAsErrors?: boolean): boolean {
  if (result.stats.errors > 0) {
    return true;
  }
  if (warningsAsErrors && result.stats.warnings > 0) {
    return true;
  }
  return false;
}

/**
 * Format lint summary
 */
export function formatLintSummary(result: LintResult): string {
  const parts: string[] = [];

  if (result.stats.errors > 0) {
    parts.push(chalkTemplate`{red ${result.stats.errors} error(s)}`);
  }
  if (result.stats.warnings > 0) {
    parts.push(chalkTemplate`{yellow ${result.stats.warnings} warning(s)}`);
  }
  if (result.stats.infos > 0) {
    parts.push(chalkTemplate`{gray ${result.stats.infos} info}`);
  }

  if (parts.length === 0) {
    return chalkTemplate`{green \u2713} No issues found`;
  }

  return `Found ${parts.join(', ')}`;
}

export interface FetchBoardsOptions {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Fetch board definitions from the remote registry
 *
 * @returns Board bundle, or null if fetch fails
 */
export async function fetchRemoteBoards(options?: FetchBoardsOptions): Promise<BoardBundle | null> {
  const timeout = options?.timeout ?? 5000;

  try {
    const response = await fetch(REMOTE_BOARDS_URL, {
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BoardBundle;
  } catch {
    // Network error, timeout, or JSON parse error
    return null;
  }
}
