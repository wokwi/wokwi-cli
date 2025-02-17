import chalkTemplate from 'chalk-template';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { boards } from '../project/boards.js';
import { createDiagram } from '../project/createDiagram.js';
import { findBoard } from '../project/findBoard.js';
import { createWokwiToml } from '../WokwiConfig.js';
import { type ESPIDFProjectDescription } from './projectDescription.js';

type ICreateConfigForIDFProjectParams = Pick<
  ESPIDFProjectDescription,
  'build_dir' | 'project_path' | 'app_elf'
>;

export function createConfigForIDFProject(idfProjectDescription: ICreateConfigForIDFProjectParams) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { build_dir, project_path, app_elf } = idfProjectDescription;
  const relativeBuildDir = path.relative(project_path, build_dir);

  return createWokwiToml({
    firmwarePath: relativeBuildDir + '/' + 'flasher_args.json',
    elfPath: relativeBuildDir + '/' + app_elf,
    gdbServerPort: 3333,
  });
}

type ICreateDiagramForIDFProjectParams = Pick<ESPIDFProjectDescription, 'target'>;

export function createDiagramForIDFProject(
  idfProjectDescription: ICreateDiagramForIDFProjectParams,
) {
  const { target } = idfProjectDescription;
  const board = boards.find((b) => b.idfTarget === target);
  if (!board) {
    throw new Error(
      `Target ${target} is not currently supported by Wokwi. You can create a feature request at https://github.com/wokwi/wokwi-features/issues.`,
    );
  }
  return createDiagram(board);
}

export interface IDFProjectConfigParams {
  rootDir: string;
  configPath: string;
  diagramFilePath: string;
  projectDescriptionPath: string;
  createConfig?: boolean;
  createDiagram?: boolean;
  quiet?: boolean;
}

export function idfProjectConfig(params: IDFProjectConfigParams) {
  const {
    rootDir,
    configPath,
    diagramFilePath,
    projectDescriptionPath,
    createConfig,
    createDiagram,
    quiet,
  } = params;
  const espIdfProjectDescriptionContent = readFileSync(projectDescriptionPath, 'utf8');
  const idfProjectDescription = JSON.parse(espIdfProjectDescriptionContent);
  if (createConfig) {
    const wokwiConfig = createConfigForIDFProject(idfProjectDescription);
    writeFileSync(configPath, wokwiConfig);
    if (!quiet) {
      console.log(
        chalkTemplate`Created default {yellow wokwi.toml} for IDF project in {yellow ${rootDir}}.`,
      );
    }
  }
  if (!createDiagram) {
    const diagramContent = readFileSync(diagramFilePath, 'utf8');
    const diagram = JSON.parse(diagramContent);
    const board = findBoard(diagram);
    const boardInfo = boards.find((b) => b.type === board?.type);
    if (boardInfo && boardInfo.idfTarget !== idfProjectDescription.target) {
      console.error(
        chalkTemplate`{red Error:} The IDF project is targeting {yellow ${idfProjectDescription.target}}, but the diagram is for {yellow ${boardInfo.idfTarget}}.`,
      );
      console.error(
        chalkTemplate`You can use the {green --diagram-file} option to specify a diagram for a different board, or delete the {yellow diagram.json} file to automatically create a default diagram.`,
      );
      return false;
    }
  } else {
    const diagram = createDiagramForIDFProject(idfProjectDescription);
    writeFileSync(diagramFilePath, JSON.stringify(diagram, null, 2));
    if (!quiet) {
      console.log(
        chalkTemplate`Created default {yellow diagram.json} for IDF project in {yellow ${rootDir}}.`,
      );
    }
  }

  return true;
}
