import { type APIClient, type APISimStartParams, type FlashSection } from '@wokwi/client';
import { readFileSync } from 'fs';
import { basename, dirname, resolve } from 'path';
import { type IESP32FlasherJSON } from './esp/flasherArgs.js';

type FirmwareParams = Pick<APISimStartParams, 'firmware' | 'flashSize'>;

export async function uploadESP32Firmware(
  client: APIClient,
  firmwarePath: string,
): Promise<FirmwareParams> {
  const flasherArgs = JSON.parse(readFileSync(firmwarePath, 'utf-8')) as IESP32FlasherJSON;
  if (!('flash_files' in flasherArgs)) {
    throw new Error('flash_files is not defined in flasher_args.json');
  }

  const flashSections: FlashSection[] = [];
  for (const [offset, file] of Object.entries(flasherArgs.flash_files)) {
    const offsetNum = parseInt(offset, 16);
    if (isNaN(offsetNum)) {
      throw new Error(`Invalid offset in flasher_args.json flash_files: ${offset}`);
    }

    const data = new Uint8Array(readFileSync(resolve(dirname(firmwarePath), file)));
    const fileName = `flash-${offset}.bin`;
    await client.fileUpload(fileName, data);
    flashSections.push({ offset: offsetNum, file: fileName });
  }

  return {
    firmware: flashSections,
    flashSize: flasherArgs.flash_settings?.flash_size,
  };
}

export async function uploadFirmware(
  client: APIClient,
  firmwarePath: string,
): Promise<FirmwareParams> {
  if (basename(firmwarePath) === 'flasher_args.json') {
    return await uploadESP32Firmware(client, firmwarePath);
  }

  const extension = firmwarePath.split('.').pop();
  const firmwareName = `firmware.${extension}`;
  await client.fileUpload(firmwareName, new Uint8Array(readFileSync(firmwarePath)));
  return { firmware: firmwareName };
}
