import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { WokwiTOMLChip } from './WokwiConfig.js';

function removeExtension(path: string) {
  return path.replace(/\.[^.]+$/, '');
}

export function loadChips(chips: WokwiTOMLChip[], rootDir: string) {
  const result = [];
  for (const chip of chips ?? []) {
    const wasmPath = join(rootDir, chip.binary);
    if (!existsSync(wasmPath)) {
      console.error(`Error: chip WASM file not found: ${resolve(wasmPath)}`);
      process.exit(1);
    }

    const jsonPath = join(rootDir, removeExtension(chip.binary) + '.json');
    if (!existsSync(jsonPath)) {
      console.error(`Error: chip JSON file not found: ${resolve(jsonPath)}`);
      process.exit(1);
    }

    result.push({
      name: chip.name,
      jsonPath,
      wasmPath,
    });
  }
  return result;
}
