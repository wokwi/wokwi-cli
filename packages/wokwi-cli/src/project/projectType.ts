import { join } from 'path';
import { fileExists, readFileOrNull } from '../utils/files.js';

export type ProjectType =
  | 'none'
  | 'rust'
  | 'zephyr'
  | 'platformio'
  | 'esp-idf'
  | 'pico-sdk'
  | 'arduino';

export async function detectProjectType(root: string): Promise<ProjectType | null> {
  if (await fileExists(join(root, 'Cargo.toml'))) {
    return 'rust';
  }

  if (await fileExists(join(root, 'west.yml'))) {
    return 'zephyr';
  }

  if (await fileExists(join(root, 'platformio.ini'))) {
    return 'platformio';
  }

  const cmakeLists = await readFileOrNull(join(root, 'CMakeLists.txt'));
  if (cmakeLists) {
    const cmakeListStr = Buffer.from(cmakeLists).toString();
    if (cmakeListStr.includes('$ENV{IDF_PATH}')) {
      return 'esp-idf';
    }
    if (cmakeListStr.includes('pico_sdk_init')) {
      return 'pico-sdk';
    }
  }

  if (await fileExists(join(root, '.vscode/arduino.json'))) {
    return 'arduino';
  }

  return null;
}
