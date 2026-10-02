import { base64ToByteArray, type APIClient, type APISDCardParams } from '@wokwi/client';
import { readFileSync } from 'fs';
import path from 'path';
import { formatSize, sdCardDestination, type SDCardSource } from './config.js';
import { mirrorToFolder, readFolderFiles, writeImageAtomically } from './files.js';

export interface SDCardUploadResult {
  params: APISDCardParams[];
  /** One human readable line per card */
  summary: string[];
}

/**
 * The server keeps every uploaded file for the whole session and fills a card with the files
 * matching its prefix, so each card gets names of its own to keep files from an earlier
 * simulation in the same session off the card.
 */
let nextCardId = 0;

function describeCard(source: SDCardSource) {
  return source.part != null ? `SD card "${source.part}"` : 'SD card';
}

function countFiles(count: number) {
  return `${count} file${count === 1 ? '' : 's'}`;
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
    const cardId = nextCardId++;
    const entry: APISDCardParams = { part: source.part, sizeBytes: source.sizeBytes };
    if (source.image != null) {
      const image = new Uint8Array(readFileSync(source.image));
      entry.image = `sdcard/${cardId}.img`;
      await client.fileUpload(entry.image, image);
      summary.push(
        `${describeCard(source)}: image ${path.relative(cwd, source.image) || '.'} (${formatSize(image.length)})`,
      );
    } else {
      entry.prefix = `sdcard/${cardId}/`;
      if (source.folder != null) {
        const files = readFolderFiles(source.folder);
        let bytes = 0;
        for (const file of files) {
          await client.fileUpload(entry.prefix + file.name, file.content);
          bytes += file.content.length;
        }
        summary.push(
          `${describeCard(source)}: ${countFiles(files.length)} (${formatSize(bytes)}) from ${path.relative(cwd, source.folder) || '.'}`,
        );
      } else {
        summary.push(`${describeCard(source)}: empty card`);
      }
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
    const target = sdCardDestination(source);
    if (!source.writeback || !target) {
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
        `${describeCard(source)} written to ${shownPath} (${countFiles(written)}${deleted ? `, ${deleted} deleted` : ''})`,
      );
    }
  }
  return summary;
}
