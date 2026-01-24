import type { Command } from 'commander';
import { chipCompile as compileChip } from '../../chip/chipCompile.js';
import { chipMakefile as generateMakefile } from '../../chip/chipMakefile.js';

interface CompileOptions {
  output?: string;
  quiet?: boolean;
}

interface MakefileOptions {
  output?: string;
  name?: string;
  quiet?: boolean;
}

export function chipCommand(program: Command): void {
  const chip = program.command('chip').description('Custom chip development tools');

  chip
    .command('compile <sources...>')
    .description('Compile custom chip to WebAssembly')
    .option('-o, --output <path>', 'Output file path')
    .option('-q, --quiet', 'Suppress messages')
    .action(async (sources: string[], options: CompileOptions) => {
      await compileChip(sources, {
        quiet: options.quiet,
        output: options.output,
      });
    });

  chip
    .command('makefile [sources...]')
    .description('Generate Makefile for custom chips')
    .option('-o, --output <path>', 'Output path', 'Makefile')
    .option('-n, --name <name>', 'Chip name')
    .option('-q, --quiet', 'Suppress messages')
    .action(async (sources: string[], options: MakefileOptions) => {
      await generateMakefile(sources, {
        quiet: options.quiet,
        output: options.output,
        chipName: options.name,
      });
    });
}
