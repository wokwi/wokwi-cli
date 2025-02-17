import { cancel, confirm, intro, isCancel, log, note, outro, select, text } from '@clack/prompts';
import chalkTemplate from 'chalk-template';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { createWokwiToml } from '../WokwiConfig.js';
import { boards, families } from './boards.js';
import { createDiagram } from './createDiagram.js';
import { findFirmwarePath } from './findFirmwarePath.js';
import { detectProjectType } from './projectType.js';

export async function initProjectWizard(rootDir: string, opts: { diagramFile?: string }) {
  const configPath = path.join(rootDir, 'wokwi.toml');
  const diagramFilePath = path.resolve(rootDir, opts.diagramFile ?? 'diagram.json');
  const launchJsonPath = path.join(rootDir, '.vscode', 'launch.json');

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
    options: filteredBoards.map((board) => ({ value: board.type, label: board.title })),
    maxItems: (process.stdout.rows ?? 16) - 4,
  });
  const board = filteredBoards.find((b) => b.type === (boardType as string));
  if (isCancel(boardType) || !board) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const defaultFirmwarePath = await findFirmwarePath(rootDir, projectType);
  const defaultFirmwareExt = families[board.family].defaultFirmwareExt;
  const firmwarePath = await text({
    message: `Enter the path to the firmware file (e.g. firmware.${defaultFirmwareExt}):`,
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

  let vsCodeDebug: boolean = false;
  if (projectType === 'esp-idf') {
    const vsCodeDebugAnswer = await confirm({
      message: `Setup VS Code debugging for ESP-IDF project?`,
      initialValue: true,
    });
    if (isCancel(vsCodeDebugAnswer)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    if (vsCodeDebugAnswer) {
      vsCodeDebug = true;
    }

    if (vsCodeDebug && existsSync(launchJsonPath)) {
      const shouldContinue = await confirm({
        message: `VS Code debugging configuration already exists in .vscode/launch.json. This operation will overwrite it. Continue?`,
        initialValue: false,
      });
      if (!shouldContinue || isCancel(shouldContinue)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }
    }
  }

  log.info(`Writing wokwi.toml...`);
  writeFileSync(
    configPath,
    createWokwiToml({ firmwarePath, elfPath, gdbServerPort: vsCodeDebug ? 3333 : undefined }),
  );

  log.info(`Writing diagram.json...`);
  writeFileSync(diagramFilePath, JSON.stringify(createDiagram(board), null, 2));

  if (vsCodeDebug) {
    log.info(`Writing .vscode/launch.json...`);
    const vsCodeLaunchJson = {
      version: '0.2.0',
      configurations: [
        {
          name: 'Wokwi GDB',
          type: 'cppdbg',
          request: 'launch',
          // eslint-disable-next-line no-template-curly-in-string
          program: '${workspaceFolder}/' + elfPath,
          // eslint-disable-next-line no-template-curly-in-string
          cwd: '${workspaceFolder}',
          MIMode: 'gdb',
          // eslint-disable-next-line no-template-curly-in-string
          miDebuggerPath: '${command:espIdf.getToolchainGdb}',
          miDebuggerServerAddress: 'localhost:3333',
        },
      ],
    };

    mkdirSync(path.dirname(launchJsonPath), { recursive: true });
    writeFileSync(launchJsonPath, JSON.stringify(vsCodeLaunchJson, null, 2));
  }

  outro(`You're all set!`);
}
