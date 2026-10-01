import { base64ToByteArray, type APIClient, type APISDCardParams } from '@wokwi/client';
import { readFileSync } from 'fs';
import path from 'path';
import {
  formatSize,
  sdCardDestination,
  sdCardImageName,
  sdCardPrefix,
  type SDCardSource,
} from './config.js';
import { fileSize, mirrorToFolder, readFolderFiles, writeImageAtomically } from './files.js';

export interface SDCardUploadResult {
  params: APISDCardParams[];
  /** One human readable line per card */
  summary: string[];
}

function describeCard(source: SDCardSource) {
  return source.part != null ? `SD card "${source.part}"` : 'SD card';
}

/** Uploads the SD card sources and returns the `sdcards` parameter for `sim:start` */
export async function uploadSDCards(
  client: APIClient,
  sources: SDCardSource[],
  cwd: string,
): Promise<SDCardUploadResult> {
  const params: APISDCardParams[] = [];
  const summary: string[] = [];
  for (const source of sources) {
    const entry: APISDCardParams = { part: source.part, sizeBytes: source.sizeBytes };
    if (source.image != null) {
      const name = sdCardImageName(source);
      await client.fileUpload(name, new Uint8Array(readFileSync(source.image)));
      entry.image = name;
      summary.push(
        `${describeCard(source)}: image ${path.relative(cwd, source.image) || '.'} (${formatSize(fileSize(source.image))})`,
      );
    } else if (source.folder != null) {
      const prefix = sdCardPrefix(source);
      const files = readFolderFiles(source.folder);
      let bytes = 0;
      for (const file of files) {
        await client.fileUpload(prefix + file.name, file.content);
        bytes += file.content.length;
      }
      entry.prefix = prefix;
      summary.push(
        `${describeCard(source)}: ${files.length} file${files.length === 1 ? '' : 's'} (${formatSize(bytes)}) from ${path.relative(cwd, source.folder) || '.'}`,
      );
    } else {
      // Empty formatted card (e.g. --sdcard-out without an input)
      entry.prefix = `${sdCardPrefix(source)}empty/`;
      summary.push(`${describeCard(source)}: empty card`);
    }
    params.push(entry);
  }
  return { params, summary };
}

/**
 * Exports the cards that have write-back enabled and writes them to their destination
 * (mirroring a folder, or replacing an image file). Pause the simulation first.
 */
export async function writeBackSDCards(
  client: APIClient,
  sources: SDCardSource[],
  cwd: string,
): Promise<string[]> {
  const summary: string[] = [];
  for (const source of sources) {
    if (!source.writeback) {
      continue;
    }
    const target = sdCardDestination(source);
    if (!target) {
      continue;
    }
    const result = await client.sdcardExport({ part: source.part, format: target.format });
    const shownPath = path.relative(cwd, target.destination) || '.';
    if (target.format === 'image') {
      if (typeof result.image !== 'string') {
        throw new Error('Invalid sdcard:export response: missing image');
      }
      const image = base64ToByteArray(result.image);
      writeImageAtomically(target.destination, image);
      summary.push(`${describeCard(source)} written to ${shownPath} (${formatSize(image.length)})`);
    } else {
      if (!Array.isArray(result.files)) {
        throw new Error('Invalid sdcard:export response: missing files');
      }
      const files = result.files.map((file) => ({
        name: file.name,
        content: base64ToByteArray(file.binary),
      }));
      const { written, deleted } = mirrorToFolder(target.destination, files);
      summary.push(
        `${describeCard(source)} written to ${shownPath} (${written} file${written === 1 ? '' : 's'}${deleted ? `, ${deleted} deleted` : ''})`,
      );
    }
  }
  return summary;
}
