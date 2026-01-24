import { Command } from 'commander';
import { chipCommand, initCommand, mcpCommand, simulateCommand } from './commands/index.js';
import { readVersion } from './readVersion.js';
import { handleUnknownCommand } from './utils/didYouMean.js';

const { version, sha } = readVersion();

function printVersion(short = false): void {
  if (short) {
    console.log(`${version} (${sha})`);
  } else {
    console.log(`Wokwi CLI v${version} (${sha})`);
  }
}

export function createCLI(): Command {
  const program = new Command()
    .name('wokwi-cli')
    .version(`${version} (${sha})`, '-V, --version', 'Output the version number')
    .description('Wokwi Simulator CLI')
    .option('--short-version', 'Output the short version number')
    .hook('preAction', (thisCommand) => {
      // Print version before running any action (unless quiet)
      const opts = thisCommand.opts();
      if (opts.shortVersion) {
        printVersion(true);
        process.exit(0);
      }
      if (!opts.quiet) {
        printVersion();
      }
    });

  // Register the simulate command options on the main program (default command)
  simulateCommand(program);

  // Register other commands
  initCommand(program);
  chipCommand(program);
  mcpCommand(program);

  // Add "did you mean" for unknown commands
  program.on('command:*', (operands) => {
    handleUnknownCommand(operands[0], program);
  });

  return program;
}

export async function runCLI() {
  const program = createCLI();
  await program.parseAsync(process.argv);
}
