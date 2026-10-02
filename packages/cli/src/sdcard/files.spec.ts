import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mirrorToFolder, readFolderFiles, writeImageAtomically } from './files.js';

describe('sdcard files', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'wokwi-sdcard-files-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('lists and reads files recursively, skipping OS clutter', () => {
    mkdirSync(path.join(root, 'images', 'deep'), { recursive: true });
    mkdirSync(path.join(root, '.git'));
    writeFileSync(path.join(root, '.git', 'HEAD'), 'ref');
    writeFileSync(path.join(root, '.DS_Store'), 'junk');
    writeFileSync(path.join(root, 'hello.txt'), 'hello');
    writeFileSync(path.join(root, 'images', 'logo.bin'), new Uint8Array([1, 2, 3]));
    writeFileSync(path.join(root, 'images', 'deep', 'readme.md'), '# deep');

    const files = readFolderFiles(root);
    expect(files.map((f) => f.name)).toEqual([
      'hello.txt',
      'images/deep/readme.md',
      'images/logo.bin',
    ]);
    expect([...files[2].content]).toEqual([1, 2, 3]);
  });

  test('mirrors the card contents into the folder', () => {
    mkdirSync(path.join(root, 'old'));
    writeFileSync(path.join(root, 'old', 'gone.txt'), 'bye');
    writeFileSync(path.join(root, 'keep.txt'), 'old content');
    writeFileSync(path.join(root, '.DS_Store'), 'junk');

    const result = mirrorToFolder(root, [
      { name: 'keep.txt', content: new TextEncoder().encode('new content') },
      { name: 'logs/2026/boot.log', content: new TextEncoder().encode('booted') },
    ]);

    expect(result).toEqual({ written: 2, deleted: 1 });
    expect(readFileSync(path.join(root, 'keep.txt'), 'utf-8')).toBe('new content');
    expect(readFileSync(path.join(root, 'logs', '2026', 'boot.log'), 'utf-8')).toBe('booted');
    expect(existsSync(path.join(root, 'old'))).toBe(false);
    expect(existsSync(path.join(root, '.DS_Store'))).toBe(true);
    expect(readdirSync(root).sort()).toEqual(['.DS_Store', 'keep.txt', 'logs']);
  });

  test('creates the folder when it does not exist and refuses to escape it', () => {
    const target = path.join(root, 'new', 'folder');
    mirrorToFolder(target, [{ name: 'a.txt', content: new Uint8Array([65]) }]);
    expect(readFileSync(path.join(target, 'a.txt'), 'utf-8')).toBe('A');
    expect(() =>
      mirrorToFolder(target, [{ name: '../escape.txt', content: new Uint8Array() }]),
    ).toThrow(/outside the SD card folder/);
  });

  test('writes images atomically', () => {
    const target = path.join(root, 'out', 'card.img');
    writeImageAtomically(target, new Uint8Array([9, 8, 7]));
    expect([...readFileSync(target)]).toEqual([9, 8, 7]);
    expect(readdirSync(path.join(root, 'out'))).toEqual(['card.img']);
  });
});
