import chalkTemplate from 'chalk-template';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { ensureWasiSdk } from './wasiSdk.js';

const WOKWI_API_HEADER_URL = 'https://wokwi.com/api/chips/wokwi-api.h';

export interface ChipCompileOptions {
  quiet?: boolean;
  output?: string;
}

async function ensureWokwiApiHeader(projectDir: string, quiet: boolean): Promise<string> {
  const headerPath = join(projectDir, 'wokwi-api.h');

  if (existsSync(headerPath)) {
    if (!quiet) {
      console.log(chalkTemplate`Using existing {cyan wokwi-api.h} from project directory`);
    }
    return headerPath;
  }

  if (!quiet) {
    console.log(chalkTemplate`Downloading {cyan wokwi-api.h}...`);
  }

  try {
    const response = await fetch(WOKWI_API_HEADER_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const content = await response.text();
    writeFileSync(headerPath, content);

    if (!quiet) {
      console.log(chalkTemplate`  Saved to {cyan ${headerPath}}`);
    }
    return headerPath;
  } catch (e) {
    throw new Error(`Failed to download wokwi-api.h: ${(e as Error).message}`);
  }
}

function findChipJson(sourceFile: string, projectDir: string): string | null {
  const baseName = basename(sourceFile).replace(/\.(c|cpp|cc|cxx)$/i, '');

  const patterns = [
    join(projectDir, 'chip.json'),
    join(projectDir, `${baseName}.json`),
    join(projectDir, `${baseName}.chip.json`),
    join(dirname(sourceFile), 'chip.json'),
    join(dirname(sourceFile), `${baseName}.json`),
  ];

  for (const pattern of patterns) {
    if (existsSync(pattern)) {
      return pattern;
    }
  }

  return null;
}

export async function chipCompile(
  sourceFiles: string[],
  options: ChipCompileOptions = {},
): Promise<void> {
  const { quiet = false, output } = options;

  if (sourceFiles.length === 0) {
    console.error(chalkTemplate`{red Error:} No source files specified.`);
    process.exit(1);
  }

  // Resolve all source files
  const resolvedSources = sourceFiles.map((f) => resolve(f));

  // Check all source files exist
  for (const src of resolvedSources) {
    if (!existsSync(src)) {
      console.error(chalkTemplate`{red Error:} Source file not found: {yellow ${src}}`);
      process.exit(1);
    }
  }

  // Use first source file's directory as project directory
  const primarySource = resolvedSources[0];
  const projectDir = dirname(primarySource);

  // Determine output file
  const baseName = basename(primarySource).replace(/\.(c|cpp|cc|cxx)$/i, '');
  const outputFile = output ? resolve(output) : join(projectDir, `${baseName}.wasm`);
  const outputDir = dirname(outputFile);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  if (!quiet) {
    if (sourceFiles.length === 1) {
      console.log(chalkTemplate`{bold Compiling custom chip:} {cyan ${basename(primarySource)}}`);
    } else {
      console.log(
        chalkTemplate`{bold Compiling custom chip:} {cyan ${sourceFiles.length} source files}`,
      );
      for (const src of sourceFiles) {
        console.log(chalkTemplate`  - {cyan ${basename(src)}}`);
      }
    }
    console.log();
  }

  // Ensure WASI-SDK is available
  const wasiSdkPath = await ensureWasiSdk(quiet);

  // Ensure wokwi-api.h is available
  const headerPath = await ensureWokwiApiHeader(projectDir, quiet);
  const includeDir = dirname(headerPath);

  // Build the compilation command
  const clangPath = join(wasiSdkPath, 'bin', process.platform === 'win32' ? 'clang.exe' : 'clang');
  const sysrootPath = join(wasiSdkPath, 'share', 'wasi-sysroot');

  if (!existsSync(clangPath)) {
    console.error(chalkTemplate`{red Error:} clang not found at {yellow ${clangPath}}`);
    console.error(chalkTemplate`Please ensure WASI-SDK is correctly installed.`);
    process.exit(1);
  }

  const args = [
    '--target=wasm32-wasi',
    `--sysroot=${sysrootPath}`,
    '-nostartfiles',
    '-Wl,--no-entry',
    '-Wl,--import-memory',
    '-Wl,--export-table',
    `-I${includeDir}`,
    '-O2',
    '-o',
    outputFile,
    ...resolvedSources,
  ];

  if (!quiet) {
    console.log();
    console.log(chalkTemplate`{bold Compiling...}`);
  }

  return new Promise((resolvePromise) => {
    const proc = spawn(clangPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const chipJsonPath = findChipJson(primarySource, projectDir);

        console.log();
        console.log(chalkTemplate`{green Success!} Compiled to {cyan ${outputFile}}`);

        const stats = readFileSync(outputFile);
        const sizeKB = (stats.length / 1024).toFixed(1);
        console.log(chalkTemplate`  Output size: {yellow ${sizeKB} KB}`);

        if (chipJsonPath) {
          console.log(chalkTemplate`  chip.json: {cyan ${chipJsonPath}}`);
        } else {
          console.log();
          console.log(
            chalkTemplate`{yellow Note:} No chip.json found. You'll need to create one with your chip's pin definitions.`,
          );
          console.log(chalkTemplate`  Example chip.json:`);
          console.log(chalkTemplate`  {dim \{}`);
          console.log(chalkTemplate`  {dim   "name": "${baseName}",}`);
          console.log(chalkTemplate`  {dim   "pins": ["OUT", "IN", "VCC", "GND"]}`);
          console.log(chalkTemplate`  {dim \}}`);
        }

        resolvePromise();
      } else {
        console.error();
        console.error(chalkTemplate`{red Compilation failed!}`);
        if (stderr) {
          const cleanedErrors = stderr
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
              // Clean up paths in error messages for readability
              for (const src of resolvedSources) {
                line = line.replace(src, basename(src));
              }
              return line;
            })
            .join('\n');
          console.error(cleanedErrors);
        }
        process.exit(1);
      }
    });

    proc.on('error', (err) => {
      console.error(chalkTemplate`{red Error:} Failed to run clang: ${err.message}`);
      process.exit(1);
    });
  });
}
