import type { Command } from 'commander';
import { initProjectWizard } from '../project/initProjectWizard.js';

interface InitOptions {
  diagramFile?: string;
}

export function initCommand(program: Command): void {
  program
    .command('init [path]')
    .description('Initialize a new Wokwi project')
    .option('--diagram-file <path>', 'Custom diagram.json path')
    .action(async (path: string | undefined, options: InitOptions) => {
      await initProjectWizard(path ?? '.', { diagramFile: options.diagramFile });
    });
}
