import { cancel, confirm, intro, isCancel, log, note, outro, select, text } from '@clack/prompts';
import chalkTemplate from 'chalk-template';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import { boards } from './boards.js';
import { createDiagram } from './createDiagram.js';
import { findFirmwarePath } from './findFirmwarePath.js';
import { detectProjectType } from './projectType.js';

export async function initProjectWizard(rootDir: string, opts: { diagramFile?: string }) {
  const configPath = path.join(rootDir, 'wokwi.toml');
  const diagramFilePath = path.resolve(rootDir, opts.diagramFile ?? 'diagram.json');

  intro(`Wokwi CLI - Project Initialization Wizard`);

  note(`This wizard will help you configure your project for Wokwi.`, 'Welcome');

  const existingFiles = [];
  if (existsSync(configPath)) {
    existingFiles.push('wokwi.toml');
  }
  if (existsSync(diagramFilePath)) {
    existingFiles.push('diagram.json');
  }

  if (existingFiles.length > 0) {
    const shouldContinue = await confirm({
      message: `${existingFiles.join(
        ' and ',
      )} already exist in the project directory. This operation will overwrite them. Continue?`,
      initialValue: false,
    });
    if (!shouldContinue || isCancel(shouldContinue)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  const projectType = await detectProjectType(rootDir);
  if (projectType != null) {
    log.info(chalkTemplate`Detected project type: {greenBright ${projectType}}`);
  }

  const filteredBoards =
    projectType === 'esp-idf'
      ? boards.filter((board) => board.family === 'esp32')
      : projectType === 'pico-sdk'
      ? boards.filter((board) => board.family === 'rp2')
      : boards;

  const boardType = await select({
    message: 'Select the board to simulate:',
    options: filteredBoards.map((board) => ({ value: board.board, label: board.title })),
    maxItems: (process.stdout.rows ?? 16) - 4,
  });
  if (isCancel(boardType)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const defaultFirmwarePath = await findFirmwarePath(rootDir, projectType);
  const firmwarePath = await text({
    message: 'Enter the path to the firmware file (e.g. firmware.bin):',
    initialValue: defaultFirmwarePath.firmware,
    validate: (value) => {
      if (!value) {
        return 'Please enter a valid path';
      }
      return undefined;
    },
  });
  if (isCancel(firmwarePath)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  let elfPath = firmwarePath;
  if (!elfPath.endsWith('.elf')) {
    const elfPathResponse = await text({
      message: 'Enter the path to the ELF file (e.g. firmware.elf):',
      initialValue: defaultFirmwarePath.elf,
      validate: (value) => {
        if (!value) {
          return 'Please enter a valid path';
        }
        return undefined;
      },
    });
    if (isCancel(elfPathResponse)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    elfPath = elfPathResponse;
  }

  log.info(`Writing wokwi.toml...`);
  writeFileSync(
    configPath,
    `# Wokwi Configuration File
# Reference: https://docs.wokwi.com/vscode/project-config

[wokwi]
version = 1
firmware = '${firmwarePath}'
elf = '${elfPath}'
`,
  );

  log.info(`Writing diagram.json...`);
  writeFileSync(diagramFilePath, JSON.stringify(createDiagram(boardType as string), null, 2));

  outro(`You're all set!`);
}
