import { parse as tomlParse } from '@iarna/toml';
import type { WokwiTOML } from './WokwiConfig.js';
import { validateSDCardConfig } from './sdcard/config.js';

export async function parseConfig(data: string, _configRoot: string) {
  const tomlSource = data.replace(/\r\n/g, '\n');
  try {
    const tomlData = tomlParse(tomlSource);
    if (tomlData?.wokwi) {
      const wokwiConfig = tomlData as unknown as WokwiTOML;
      const { wokwi } = wokwiConfig;
      if (wokwi.version !== 1) {
        throw new Error(`Unsupported wokwi.toml version: ${wokwi.version}`);
      }

      if (typeof wokwi.firmware !== 'string') {
        throw new Error('Firmware path must be a string');
      }
      if (wokwi.elf != null && typeof wokwi.elf !== 'string') {
        throw new Error('ELF path must be a string');
      }
      if (wokwiConfig.sdcard != null) {
        if (!Array.isArray(wokwiConfig.sdcard)) {
          throw new Error('`sdcard` must be an array of tables: use [[sdcard]]');
        }
        wokwiConfig.sdcard = wokwiConfig.sdcard.map((entry, index) =>
          validateSDCardConfig(entry, index),
        );
      }

      return wokwiConfig;
    }
    throw new Error('Missing `[wokwi]` section in wokwi.toml');
  } catch (err: any) {
    throw new Error(`Error in wokwi.toml: ${(err?.message as string).replace(/:?\n.+/g, '')}`);
  }
}
