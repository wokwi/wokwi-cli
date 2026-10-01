import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import path from 'path';

/** Operating system clutter that is never copied to the card nor removed by write-back */
export const SKIPPED_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini', '.git']);

export interface SDCardFile {
  /** Path on the card, `/`-separated, relative to the card root */
  name: string;
  content: Uint8Array;
}

/** Recursively lists the files of a folder (names use `/` and are relative to the folder) */
export function listFolderFiles(folder: string): string[] {
  const result: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIPPED_NAMES.has(entry.name)) {
        continue;
      }
      const name = prefix + entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), name + '/');
      } else if (entry.isFile()) {
        result.push(name);
      }
    }
  };
  walk(folder, '');
  return result.sort();
}

/** Reads all the files of a folder into memory */
export function readFolderFiles(folder: string): SDCardFile[] {
  return listFolderFiles(folder).map((name) => ({
    name,
    content: new Uint8Array(readFileSync(path.join(folder, ...name.split('/')))),
  }));
}

function assertInside(folder: string, target: string) {
  const relative = path.relative(folder, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside the SD card folder: ${target}`);
  }
}

/**
 * Makes `folder` mirror the given card contents: files are written (creating directories as
 * needed), files that are no longer on the card are deleted, and directories left empty are
 * removed. Nothing outside the folder is touched, and the skipped OS clutter is left alone.
 */
export function mirrorToFolder(folder: string, files: SDCardFile[]) {
  mkdirSync(folder, { recursive: true });
  const keep = new Set<string>();
  for (const file of files) {
    const target = path.join(folder, ...file.name.split('/'));
    assertInside(folder, target);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    keep.add(file.name);
  }

  let deleted = 0;
  for (const name of listFolderFiles(folder)) {
    if (!keep.has(name)) {
      unlinkSync(path.join(folder, ...name.split('/')));
      deleted++;
    }
  }
  removeEmptyDirs(folder, false);
  return { written: files.length, deleted };
}

function removeEmptyDirs(dir: string, removeSelf: boolean) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIPPED_NAMES.has(entry.name)) {
      removeEmptyDirs(path.join(dir, entry.name), true);
    }
  }
  if (removeSelf && readdirSync(dir).length === 0) {
    rmdirSync(dir);
  }
}

/** Writes an image to a temporary file next to the target and renames it into place */
export function writeImageAtomically(target: string, image: Uint8Array) {
  mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, image);
  renameSync(temp, target);
}

export function fileSize(filePath: string) {
  return statSync(filePath).size;
}
