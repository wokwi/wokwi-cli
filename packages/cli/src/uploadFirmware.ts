import { type APIClient } from '@wokwi/client';
import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { type IESP32FlasherJSON } from './esp/flasherArgs.js';

interface IFirmwarePiece {
  offset: number;
  data: Uint8Array;
}

function parseBinarySize(input: string): number {
  const match = input.trim().match(/^(\d+)\s*(KB|MB|GB|TB)?$/i);

  if (!match) {
    throw new Error(`Invalid size format: "${input}"`);
  }

  const value = Number(match[1]);
  const unit = match[2]?.toUpperCase();

  switch (unit) {
    case undefined:
      return value; // bytes
    case 'KB':
      return value * 1024;
    case 'MB':
      return value * 1024 ** 2;
    case 'GB':
      return value * 1024 ** 3;
    case 'TB':
      return value * 1024 ** 4;
    default:
      // unreachable due to regex, but keeps TS happy
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

export async function uploadESP32Firmware(client: APIClient, firmwarePath: string) {
  const flasherArgs = JSON.parse(readFileSync(firmwarePath, 'utf-8')) as IESP32FlasherJSON;
  if (!('flash_settings' in flasherArgs) || !('flash_size' in flasherArgs.flash_settings)) {
    throw new Error('flash_settings or flash_size is not defined in flasher_args.json');
  }
  const maxFirmwareSize = parseBinarySize(flasherArgs.flash_settings.flash_size);

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

  if (firmwareSize > maxFirmwareSize) {
    throw new Error(
      `Firmware size (${firmwareSize} bytes) exceeds the flash capacity (${maxFirmwareSize} bytes)`,
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
