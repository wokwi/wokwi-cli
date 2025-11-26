import { join } from 'path';
import { readFileOrNull } from '../utils/files.js';
import { type ProjectType } from './projectType.js';

export interface FindFirmwarePathResult {
  firmware?: string;
  elf?: string;
}

export async function findFirmwarePath(
  rootDir: string,
  projectType: ProjectType | null,
): Promise<FindFirmwarePathResult> {
  const cmakeLists = await readFileOrNull(join(rootDir, 'CMakeLists.txt'));

  switch (projectType) {
    case 'esp-idf': {
      const projectName = cmakeLists?.toString('utf-8').match(/\Wproject\(([^\s)]+)\)/i)?.[1];
      return {
        firmware: 'build/flasher_args.json',
        elf: projectName && `build/${projectName}.elf`,
      };
    }

    case 'pico-sdk': {
      const projectName = cmakeLists?.toString('utf-8').match(/\Wadd_executable\(([^\s)]+)/i)?.[1];
      return {
        firmware: projectName && `build/${projectName}.uf2`,
        elf: projectName && `build/${projectName}.elf`,
      };
    }

    case 'platformio': {
      const platformIni = await readFileOrNull(join(rootDir, 'platformio.ini'));
      const firstEnv = platformIni?.toString('utf-8').match(/\[env:([^\s\]]+)\]/)?.[1];
      return {
        firmware: firstEnv && `.pio/build/${firstEnv}/firmware.bin`,
        elf: firstEnv && `.pio/build/${firstEnv}/firmware.elf`,
      };
    }

    default:
      return {};
  }
}
