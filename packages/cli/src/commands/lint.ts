import { DiagramLinter } from '@wokwi/diagram-lint';
import chalkTemplate from 'chalk-template';
import type { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  displayLintResults,
  fetchRemoteBoards,
  formatLintSummary,
  hasLintErrors,
} from '../lint/index.js';

interface LintOptions {
  ignoreWarnings?: boolean;
  warningsAsErrors?: boolean;
  offline?: boolean;
}

export function lintCommand(program: Command): void {
  program
    .command('lint')
    .description('Lint a Wokwi diagram file')
    .argument('[path]', 'Path to diagram.json or project directory', '.')
    .option('--ignore-warnings', 'Do not report warnings')
    .option('--warnings-as-errors', 'Treat warnings as errors (exit code 1)')
    .option('--offline', 'Skip downloading latest board definitions')
    .action(async (projectPath: string, options: LintOptions) => {
      await runLint(projectPath, options);
    });
}

async function runLint(projectPath: string, options: LintOptions) {
  const { ignoreWarnings, warningsAsErrors, offline } = options;
  const shouldFetch = !offline;

  // Resolve diagram path
  let diagramPath = path.resolve(projectPath);
  if (existsSync(diagramPath) && !diagramPath.endsWith('.json')) {
    // If it's a directory, look for diagram.json inside
    const diagramFile = path.join(diagramPath, 'diagram.json');
    if (existsSync(diagramFile)) {
      diagramPath = diagramFile;
    } else {
      console.error(chalkTemplate`{red Error:} diagram.json not found in {yellow ${projectPath}}`);
      process.exit(1);
    }
  }

  if (!existsSync(diagramPath)) {
    console.error(chalkTemplate`{red Error:} File not found: {yellow ${diagramPath}}`);
    process.exit(1);
  }

  // Create linter
  const linter = new DiagramLinter();

  // Try to fetch remote boards (only for lint command)
  if (shouldFetch) {
    const remoteBoards = await fetchRemoteBoards();
    if (remoteBoards) {
      linter.getRegistry().loadBoardsBundle(remoteBoards);
    }
  }

  // Read and lint the diagram
  let diagramContent: string;
  try {
    diagramContent = readFileSync(diagramPath, 'utf-8');
  } catch {
    console.error(chalkTemplate`{red Error:} Could not read file: {yellow ${diagramPath}}`);
    process.exit(1);
  }

  const result = linter.lintJSON(diagramContent);

  // Filter issues if ignoring warnings
  const filteredIssues = ignoreWarnings
    ? result.issues.filter((i) => i.severity === 'error')
    : result.issues;

  if (filteredIssues.length === 0) {
    console.log(chalkTemplate`{green \u2713} No issues found`);
    process.exit(0);
  }

  // Display results
  displayLintResults(result, { quiet: ignoreWarnings });

  // Summary
  console.log('');
  console.log(formatLintSummary(result));

  // Exit code
  if (hasLintErrors(result, warningsAsErrors)) {
    process.exit(1);
  }
  process.exit(0);
}
