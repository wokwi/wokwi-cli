import { type APIClient } from '@wokwi/client';
import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { type IESP32FlasherJSON } from './esp/flasherArgs.js';

interface IFirmwarePiece {
  offset: number;
  data: Uint8Array;
}

const MAX_FIRMWARE_SIZE = 4 * 1024 * 1024;

export async function uploadESP32Firmware(client: APIClient, firmwarePath: string) {
  const flasherArgs = JSON.parse(readFileSync(firmwarePath, 'utf-8')) as IESP32FlasherJSON;
  if (!('flash_files' in flasherArgs)) {
    throw new Error('flash_files is not defined in flasher_args.json');
  }

  const firmwareParts: IFirmwarePiece[] = [];
  let firmwareSize = 0;
  for (const [offset, file] of Object.entries(flasherArgs.flash_files)) {
    const offsetNum = parseInt(offset, 16);
    if (isNaN(offsetNum)) {
      throw new Error(`Invalid offset in flasher_args.json flash_files: ${offset}`);
    }

    const data = new Uint8Array(readFileSync(resolve(dirname(firmwarePath), file)));
    firmwareParts.push({ offset: offsetNum, data });
    firmwareSize = Math.max(firmwareSize, offsetNum + data.byteLength);
  }

  if (firmwareSize > MAX_FIRMWARE_SIZE) {
    throw new Error(
      `Firmware size (${firmwareSize} bytes) exceeds the maximum supported size (${MAX_FIRMWARE_SIZE} bytes)`,
    );
  }

  const firmwareData = new Uint8Array(firmwareSize);
  for (const { offset, data } of firmwareParts) {
    firmwareData.set(data, offset);
  }
  await client.fileUpload('firmware.bin', firmwareData);

  return 'firmware.bin';
}

export async function uploadFirmware(client: APIClient, firmwarePath: string) {
  if (basename(firmwarePath) === 'flasher_args.json') {
    return await uploadESP32Firmware(client, firmwarePath);
  }

  const extension = firmwarePath.split('.').pop();
  const firmwareName = `firmware.${extension}`;
  await client.fileUpload(firmwareName, new Uint8Array(readFileSync(firmwarePath)));
  return firmwareName;
}
