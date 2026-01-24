import type { Command } from 'commander';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest matching command name
 */
export function findClosestCommand(
  input: string,
  commands: string[],
  maxDistance = 3,
): string | null {
  const matches = commands
    .map((cmd) => ({ cmd, dist: levenshtein(input.toLowerCase(), cmd.toLowerCase()) }))
    .filter(({ dist }) => dist <= maxDistance)
    .sort((a, b) => a.dist - b.dist);

  return matches.length > 0 ? matches[0].cmd : null;
}

/**
 * Handle unknown commands with "did you mean" suggestions
 */
export function handleUnknownCommand(input: string, program: Command): void {
  const commands = program.commands.map((c) => c.name());
  const closest = findClosestCommand(input, commands);

  console.error(`error: unknown command '${input}'`);
  if (closest) {
    console.error(`\nDid you mean '${closest}'?\n`);
  }
  console.error(`Run 'wokwi-cli --help' for available commands.`);
  process.exit(1);
}

/**
 * Check if a path argument looks like a typo of a known command.
 * Returns the suggested command if it's a likely typo, null otherwise.
 */
export function checkForCommandTypo(pathArg: string, knownCommands: string[]): string | null {
  // Don't check if it looks like a path (contains / or \)
  if (pathArg.includes('/') || pathArg.includes('\\')) {
    return null;
  }

  // Don't check if it starts with . (like . or ..)
  if (pathArg.startsWith('.')) {
    return null;
  }

  return findClosestCommand(pathArg, knownCommands, 3);
}
