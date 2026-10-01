import { existsSync, statSync } from 'fs';
import path from 'path';
import type { WokwiTOMLSDCard } from '../WokwiConfig.js';

const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;

export const SD_BLOCK_SIZE = 512;
/** Smallest card the simulator can format (FAT16 with 512-byte clusters) */
export const MIN_FORMATTED_SD_SIZE = 2 * MB;
/** Largest card we send to the simulator. The shared CI server caps cards at 64 MB. */
export const MAX_SD_SIZE = 256 * MB;

/** A resolved SD card source, with absolute paths */
export interface SDCardSource {
  /** Diagram part id; undefined for the only card in the diagram */
  part?: string;
  /** Directory tree to copy onto a freshly formatted card */
  folder?: string;
  /** Raw disk image to serve as the card */
  image?: string;
  /** Card capacity in bytes (undefined: simulator default, 8 MB) */
  sizeBytes?: number;
  /** Write the card contents back when the simulation ends */
  writeback: boolean;
  /** Write-back destination (defaults to the source); `.img` → image, otherwise a folder */
  output?: string;
}

export interface SDCardFlags {
  /** `--sdcard <path>` values (`<path>` or `<part>=<path>`), or `false` for `--no-sdcard` */
  sdcard?: string[] | false;
  /** `--sdcard-size <size>` */
  sdcardSize?: string;
  /** `--sdcard-writeback` */
  sdcardWriteback?: boolean;
  /** `--sdcard-out <path>` values (`<path>` or `<part>=<path>`) */
  sdcardOut?: string[];
}

/**
 * Parses a card size such as `8M`, `512K`, `1G`, `32MB` or a plain number of bytes.
 */
export function parseSize(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid size: ${value}`);
    }
    return value;
  }
  const match = /^\s*(\d+(?:\.\d+)?)\s*([kmg]?)b?\s*$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid size: "${value}" (expected e.g. 8M, 512K, 1G or a number of bytes)`);
  }
  const amount = parseFloat(match[1]);
  const multiplier = { '': 1, k: KB, m: MB, g: GB }[match[2].toLowerCase()] ?? 1;
  const bytes = Math.round(amount * multiplier);
  if (bytes <= 0) {
    throw new Error(`Invalid size: "${value}"`);
  }
  return bytes;
}

export function formatSize(bytes: number) {
  if (bytes >= MB && bytes % MB === 0) {
    return `${bytes / MB} MB`;
  }
  if (bytes >= KB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  return `${bytes} bytes`;
}

export function validateSDCardSize(sizeBytes: number, kind: 'folder' | 'image') {
  if (sizeBytes % SD_BLOCK_SIZE !== 0) {
    throw new Error(`SD card size ${sizeBytes} must be a multiple of ${SD_BLOCK_SIZE} bytes`);
  }
  if (kind === 'folder' && sizeBytes < MIN_FORMATTED_SD_SIZE) {
    throw new Error(
      `SD card size ${formatSize(sizeBytes)} is too small; the minimum is ${formatSize(MIN_FORMATTED_SD_SIZE)}`,
    );
  }
  if (sizeBytes > MAX_SD_SIZE) {
    throw new Error(
      `SD card size ${formatSize(sizeBytes)} exceeds the maximum of ${formatSize(MAX_SD_SIZE)}`,
    );
  }
}

/** `.img` (any case) means a raw disk image; anything else is a folder */
export function isImagePath(filePath: string) {
  return /\.img$/i.test(filePath);
}

/** Validates a `[[sdcard]]` entry from wokwi.toml (paths are not checked for existence here) */
export function validateSDCardConfig(entry: unknown, index: number): WokwiTOMLSDCard {
  const where = `[[sdcard]] #${index + 1}`;
  if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`${where} must be a table`);
  }
  const { part, folder, image, size, writeback } = entry as Record<string, unknown>;
  if (part != null && (typeof part !== 'string' || !part.length)) {
    throw new Error(`${where}: \`part\` must be a non-empty string`);
  }
  if (folder != null && typeof folder !== 'string') {
    throw new Error(`${where}: \`folder\` must be a string`);
  }
  if (image != null && typeof image !== 'string') {
    throw new Error(`${where}: \`image\` must be a string`);
  }
  if (folder != null && image != null) {
    throw new Error(`${where}: specify either \`folder\` or \`image\`, not both`);
  }
  if (folder == null && image == null) {
    throw new Error(`${where}: missing \`folder\` or \`image\``);
  }
  if (size != null) {
    if (typeof size !== 'string' && typeof size !== 'number') {
      throw new Error(`${where}: \`size\` must be a string (e.g. '32M') or a number of bytes`);
    }
    validateSDCardSize(parseSize(size), image != null ? 'image' : 'folder');
  }
  if (writeback != null && typeof writeback !== 'boolean') {
    throw new Error(`${where}: \`writeback\` must be true or false`);
  }
  return {
    part: part as string | undefined,
    folder: folder as string | undefined,
    image: image as string | undefined,
    size: size as string | number | undefined,
    writeback: writeback as boolean | undefined,
  };
}

/** Splits `<part>=<path>` into its parts; a bare `<path>` has no part */
export function parsePartPath(value: string): { part?: string; path: string } {
  const match = /^([A-Za-z0-9_.-]+)=(.+)$/.exec(value);
  if (match && !existsSync(value)) {
    return { part: match[1], path: match[2] };
  }
  return { path: value };
}

function sourceFromPath(
  part: string | undefined,
  filePath: string,
  baseDir: string,
  origin: string,
): SDCardSource {
  const absolute = path.resolve(baseDir, filePath);
  if (!existsSync(absolute)) {
    throw new Error(`SD card source not found: ${absolute} (${origin})`);
  }
  if (statSync(absolute).isDirectory()) {
    return { part, folder: absolute, writeback: false };
  }
  return { part, image: absolute, writeback: false };
}

export interface ResolveSDCardsParams {
  /** Project directory (where wokwi.toml lives); `[[sdcard]]` paths and the `sdcard/` default resolve here */
  rootDir: string;
  /** Directory command line paths resolve against */
  cwd: string;
  config?: WokwiTOMLSDCard[];
  flags?: SDCardFlags;
}

/**
 * Resolves the SD card sources for a run. Precedence: command line flags, then `[[sdcard]]`
 * sections in wokwi.toml, then a `sdcard/` directory next to wokwi.toml, then nothing.
 */
export function resolveSDCards({ rootDir, cwd, config, flags = {} }: ResolveSDCardsParams) {
  if (flags.sdcard === false) {
    return [];
  }

  let sources: SDCardSource[] = [];
  if (flags.sdcard?.length) {
    sources = flags.sdcard.map((value) => {
      const { part, path: sourcePath } = parsePartPath(value);
      return sourceFromPath(part, sourcePath, cwd, '--sdcard');
    });
  } else if (config?.length) {
    sources = config.map((entry) => {
      const source = sourceFromPath(
        entry.part,
        (entry.folder ?? entry.image)!,
        rootDir,
        'wokwi.toml',
      );
      if (entry.size != null) {
        source.sizeBytes = parseSize(entry.size);
      }
      source.writeback = entry.writeback ?? false;
      return source;
    });
  } else {
    const defaultFolder = path.join(rootDir, 'sdcard');
    if (existsSync(defaultFolder) && statSync(defaultFolder).isDirectory()) {
      sources = [{ folder: defaultFolder, writeback: false }];
    }
  }

  if (flags.sdcardOut?.length && !sources.length) {
    // No input, but the user wants the results: start with an empty formatted card
    sources = [{ writeback: false }];
  }

  if (flags.sdcardSize != null) {
    const sizeBytes = parseSize(flags.sdcardSize);
    for (const source of sources) {
      source.sizeBytes = sizeBytes;
    }
  }

  if (flags.sdcardWriteback) {
    for (const source of sources) {
      source.writeback = true;
    }
  }

  for (const value of flags.sdcardOut ?? []) {
    const { part, path: outPath } = parsePartPath(value);
    const target =
      part != null
        ? sources.find((source) => source.part === part)
        : (sources.find((source) => source.part == null) ?? sources[0]);
    if (!target) {
      throw new Error(
        part != null
          ? `--sdcard-out: no SD card configured for part "${part}"`
          : '--sdcard-out: no SD card configured',
      );
    }
    target.output = path.resolve(cwd, outPath);
    target.writeback = true;
  }

  const unqualified = sources.filter((source) => source.part == null);
  if (unqualified.length > 1) {
    throw new Error('Multiple SD card sources without a part id; use <part>=<path>');
  }
  const seen = new Set<string>();
  for (const source of sources) {
    if (source.part != null) {
      if (seen.has(source.part)) {
        throw new Error(`Duplicate SD card configuration for part "${source.part}"`);
      }
      seen.add(source.part);
    }
    if (source.sizeBytes != null) {
      validateSDCardSize(source.sizeBytes, source.image != null ? 'image' : 'folder');
    }
    if (
      source.writeback &&
      source.output == null &&
      source.folder == null &&
      source.image == null
    ) {
      throw new Error('SD card write-back needs a folder, an image or --sdcard-out');
    }
  }

  return sources;
}

/** Name prefix of the uploaded files for a card, e.g. `sdcard/` or `sdcard/sd1/` */
export function sdCardPrefix(source: SDCardSource) {
  return source.part != null ? `sdcard/${source.part}/` : 'sdcard/';
}

/** Name of the uploaded raw image for a card */
export function sdCardImageName(source: SDCardSource) {
  return `sdcard/${source.part ?? '0'}.img`;
}

/** Where the card is written back to, and in which format */
export function sdCardDestination(source: SDCardSource) {
  const destination = source.output ?? source.folder ?? source.image;
  if (destination == null) {
    return undefined;
  }
  const format: 'image' | 'files' =
    source.output != null
      ? isImagePath(source.output)
        ? 'image'
        : 'files'
      : source.image != null
        ? 'image'
        : 'files';
  return { destination, format };
}
