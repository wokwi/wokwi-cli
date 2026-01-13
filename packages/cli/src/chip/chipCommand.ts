import arg from 'arg';
import chalkTemplate from 'chalk-template';
import { chipCompile } from './chipCompile.js';
import { chipMakefile } from './chipMakefile.js';

export function chipCommandHelp(): void {
  console.log(chalkTemplate`
  {bold USAGE}

      {dim $} {bold wokwi-cli} chip <command> [options]

  {bold COMMANDS}

      {green compile}     Compile a custom chip to WebAssembly
      {green makefile}    Generate a Makefile for building custom chips

  {bold EXAMPLES}

      {dim $} {bold wokwi-cli} chip compile my-chip.c
      {dim $} {bold wokwi-cli} chip makefile -o Makefile

  Run {green wokwi-cli chip <command> --help} for more information on a command.
`);
}

export async function handleChipCommand(argv: string[], quiet: boolean): Promise<void> {
  // First argument after 'chip' is the subcommand
  const subcommand = argv[0];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    chipCommandHelp();
    return;
  }

  // Remove subcommand from argv
  const subArgs = argv.slice(1);

  switch (subcommand) {
    case 'compile':
      await handleCompileCommand(subArgs, quiet);
      break;
    case 'makefile':
      await handleMakefileCommand(subArgs, quiet);
      break;
    default:
      console.error(chalkTemplate`{red Error:} Unknown chip subcommand: {yellow ${subcommand}}`);
      console.error(chalkTemplate`Available subcommands: {green compile}, {green makefile}`);
      console.error(chalkTemplate`Run {green wokwi-cli chip --help} for usage.`);
      process.exit(1);
  }
}

async function handleCompileCommand(argv: string[], globalQuiet: boolean): Promise<void> {
  const compileArgs = arg(
    {
      '--help': Boolean,
      '--output': String,
      '--quiet': Boolean,
      '-h': '--help',
      '-o': '--output',
      '-q': '--quiet',
    },
    { argv, permissive: false },
  );

  if (compileArgs['--help']) {
    chipCompileHelp();
    return;
  }

  const sourceFiles = compileArgs._;
  if (sourceFiles.length === 0) {
    console.error(chalkTemplate`{red Error:} Missing source file argument.`);
    console.error(chalkTemplate`Run {green wokwi-cli chip compile --help} for usage.`);
    process.exit(1);
  }

  const quiet = compileArgs['--quiet'] ?? globalQuiet;
  const output = compileArgs['--output'];

  await chipCompile(sourceFiles, { quiet, output });
}

async function handleMakefileCommand(argv: string[], globalQuiet: boolean): Promise<void> {
  const makefileArgs = arg(
    {
      '--help': Boolean,
      '--output': String,
      '--quiet': Boolean,
      '--name': String,
      '-h': '--help',
      '-o': '--output',
      '-q': '--quiet',
      '-n': '--name',
    },
    { argv, permissive: false },
  );

  if (makefileArgs['--help']) {
    chipMakefileHelp();
    return;
  }

  const sourceFiles = makefileArgs._;
  const quiet = makefileArgs['--quiet'] ?? globalQuiet;
  const output = makefileArgs['--output'] ?? 'Makefile';
  const chipName = makefileArgs['--name'];

  await chipMakefile(sourceFiles, { quiet, output, chipName });
}

function chipCompileHelp(): void {
  console.log(chalkTemplate`
  {bold USAGE}

      {dim $} {bold wokwi-cli} chip compile [options] <source-files...>

  {bold DESCRIPTION}

      Compiles custom chip source file(s) (.c) to WebAssembly (.wasm) for use in Wokwi.

      The compiler will automatically:
      - Download and install WASI-SDK if not present (~/.wokwi/wasi-sdk)
      - Download wokwi-api.h if not present in the project directory
      - Generate a .wasm file in the same directory as the first source file

  {bold OPTIONS}

      {green -o}, {green --output} <path>      Output file path (default: <source>.wasm)
      {green -q}, {green --quiet}              Suppress informational messages

  {bold ENVIRONMENT VARIABLES}

      {yellow WASI_SDK_PATH}            Path to WASI-SDK installation (optional)
                                 If not set, WASI-SDK will be installed to ~/.wokwi/wasi-sdk

  {bold EXAMPLES}

      Compile a single file:
      {dim $} {bold wokwi-cli} chip compile my-chip.c

      Compile multiple files:
      {dim $} {bold wokwi-cli} chip compile main.c utils.c helpers.c

      Compile with custom output path:
      {dim $} {bold wokwi-cli} chip compile -o dist/chip.wasm src/main.c src/utils.c

      Use a custom WASI-SDK:
      {dim $} WASI_SDK_PATH=/opt/wasi-sdk wokwi-cli chip compile my-chip.c

  {bold PROJECT STRUCTURE}

      A typical custom chip project should have:
      - {cyan main.c} or {cyan <chip-name>.c}   - Chip source code
      - {cyan chip.json}                  - Chip pin definitions
      - {cyan wokwi-api.h}                - Wokwi API header (auto-downloaded)

  {bold CHIP.JSON FORMAT}

      {dim \{}
      {dim   "name": "My Chip",}
      {dim   "author": "Your Name",}
      {dim   "pins": ["OUT", "IN", "VCC", "GND"]}
      {dim \}}

`);
}

function chipMakefileHelp(): void {
  console.log(chalkTemplate`
  {bold USAGE}

      {dim $} {bold wokwi-cli} chip makefile [options] [source-files...]

  {bold DESCRIPTION}

      Generates a Makefile for building custom chips with WASI-SDK.

      This is useful for advanced users who want more control over the build process,
      want to integrate with existing build systems, or need custom build options.

  {bold OPTIONS}

      {green -o}, {green --output} <path>      Output file path (default: Makefile)
      {green -n}, {green --name} <name>        Chip name for output file (default: chip)
      {green -q}, {green --quiet}              Suppress informational messages

  {bold EXAMPLES}

      Generate a basic Makefile:
      {dim $} {bold wokwi-cli} chip makefile

      Generate with specific source files:
      {dim $} {bold wokwi-cli} chip makefile main.c utils.c

      Generate with custom output name:
      {dim $} {bold wokwi-cli} chip makefile -o build/Makefile -n my-chip

  {bold GENERATED MAKEFILE}

      The generated Makefile will:
      - Auto-detect WASI-SDK from WASI_SDK_PATH or use default location
      - Download wokwi-api.h if not present
      - Compile all source files to a single .wasm output
      - Support {green make}, {green make clean}, and {green make wokwi-api.h}

`);
}
