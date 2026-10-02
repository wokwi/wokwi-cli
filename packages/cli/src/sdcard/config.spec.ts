import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  parsePartPath,
  parseSize,
  resolveSDCards,
  sdCardDestination,
  validateSDCardConfig,
  validateSDCardSize,
} from './config.js';

const MB = 1024 * 1024;

describe('parseSize', () => {
  test('parses suffixes and plain numbers', () => {
    expect(parseSize('8M')).toBe(8 * MB);
    expect(parseSize('32MB')).toBe(32 * MB);
    expect(parseSize('512K')).toBe(512 * 1024);
    expect(parseSize('1G')).toBe(1024 * MB);
    expect(parseSize('1.5m')).toBe(1.5 * MB);
    expect(parseSize('4096')).toBe(4096);
    expect(parseSize(2048)).toBe(2048);
  });

  test('rejects garbage', () => {
    expect(() => parseSize('big')).toThrow(/Invalid size/);
    expect(() => parseSize('')).toThrow(/Invalid size/);
    expect(() => parseSize(0)).toThrow(/Invalid size/);
    expect(() => parseSize(-1)).toThrow(/Invalid size/);
  });
});

describe('validateSDCardSize', () => {
  test('enforces block alignment and limits', () => {
    expect(() => validateSDCardSize(1000, 'image')).toThrow(/multiple of 512/);
    expect(() => validateSDCardSize(1 * MB, 'folder')).toThrow(/too small/);
    expect(() => validateSDCardSize(512, 'image')).not.toThrow();
    expect(() => validateSDCardSize(256 * MB, 'folder')).not.toThrow();
    expect(() => validateSDCardSize(256 * MB + 512, 'folder')).toThrow(/exceeds the maximum/);
  });
});

describe('validateSDCardConfig', () => {
  test('accepts a folder entry', () => {
    expect(validateSDCardConfig({ folder: 'sd', size: '32M', writeback: true }, 0)).toEqual({
      part: undefined,
      folder: 'sd',
      image: undefined,
      size: '32M',
      writeback: true,
    });
  });

  test('requires exactly one of folder / image', () => {
    expect(() => validateSDCardConfig({}, 0)).toThrow(/missing `folder` or `image`/);
    expect(() => validateSDCardConfig({ folder: 'a', image: 'b.img' }, 1)).toThrow(
      /either `folder` or `image`/,
    );
  });

  test('validates types', () => {
    expect(() => validateSDCardConfig({ folder: 1 }, 0)).toThrow(/`folder` must be a string/);
    expect(() => validateSDCardConfig({ image: 'a.img', part: '' }, 0)).toThrow(/`part`/);
    expect(() => validateSDCardConfig({ image: 'a.img', writeback: 'yes' }, 0)).toThrow(
      /`writeback`/,
    );
    expect(() => validateSDCardConfig({ folder: 'a', size: '1M' }, 0)).toThrow(/too small/);
    expect(() => validateSDCardConfig('nope', 0)).toThrow(/must be a table/);
  });
});

describe('parsePartPath', () => {
  test('splits part=path', () => {
    expect(parsePartPath('sd1=./data')).toEqual({ part: 'sd1', path: './data' });
    expect(parsePartPath('./data')).toEqual({ path: './data' });
    expect(parsePartPath('C:/cards/sd.img')).toEqual({ path: 'C:/cards/sd.img' });
    expect(parsePartPath('sd-2=C:/cards/sd.img')).toEqual({
      part: 'sd-2',
      path: 'C:/cards/sd.img',
    });
  });
});

describe('resolveSDCards', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'wokwi-sdcard-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('returns nothing when there is no config and no sdcard/ folder', () => {
    expect(resolveSDCards({ rootDir: root, cwd: root })).toEqual([]);
  });

  test('uses the sdcard/ folder next to wokwi.toml by default', () => {
    mkdirSync(path.join(root, 'sdcard'));
    expect(resolveSDCards({ rootDir: root, cwd: root })).toEqual([
      { folder: path.join(root, 'sdcard'), writeback: false },
    ]);
  });

  test('wokwi.toml entries win over the default folder and resolve relative to the project', () => {
    mkdirSync(path.join(root, 'sdcard'));
    mkdirSync(path.join(root, 'assets'));
    writeFileSync(path.join(root, 'card.img'), new Uint8Array(1024));
    const sources = resolveSDCards({
      rootDir: root,
      cwd: '/somewhere/else',
      config: [
        { part: 'sd1', folder: 'assets', size: '16M', writeback: true },
        { part: 'sd2', image: 'card.img' },
      ],
    });
    expect(sources).toEqual([
      { part: 'sd1', folder: path.join(root, 'assets'), sizeBytes: 16 * MB, writeback: true },
      { part: 'sd2', image: path.join(root, 'card.img'), writeback: false },
    ]);
  });

  test('flags win over wokwi.toml and resolve relative to cwd', () => {
    const cwd = path.join(root, 'cwd');
    mkdirSync(path.join(cwd, 'data'), { recursive: true });
    mkdirSync(path.join(root, 'assets'));
    const sources = resolveSDCards({
      rootDir: root,
      cwd,
      config: [{ folder: 'assets' }],
      flags: { sdcard: ['data'], sdcardSize: '4M', sdcardWriteback: true },
    });
    expect(sources).toEqual([
      { part: undefined, folder: path.join(cwd, 'data'), sizeBytes: 4 * MB, writeback: true },
    ]);
  });

  test('--no-sdcard disables everything', () => {
    mkdirSync(path.join(root, 'sdcard'));
    expect(
      resolveSDCards({
        rootDir: root,
        cwd: root,
        config: [{ folder: 'sdcard' }],
        flags: { sdcard: false },
      }),
    ).toEqual([]);
  });

  test('--sdcard-out sets the destination and implies write-back', () => {
    mkdirSync(path.join(root, 'sdcard'));
    const sources = resolveSDCards({
      rootDir: root,
      cwd: root,
      flags: { sdcardOut: ['results/card.img'] },
    });
    expect(sources).toEqual([
      {
        folder: path.join(root, 'sdcard'),
        writeback: true,
        output: path.join(root, 'results/card.img'),
      },
    ]);
    expect(sdCardDestination(sources[0])).toEqual({
      destination: path.join(root, 'results/card.img'),
      format: 'image',
    });
  });

  test('--sdcard-out without any input starts with an empty card', () => {
    const sources = resolveSDCards({ rootDir: root, cwd: root, flags: { sdcardOut: ['out'] } });
    expect(sources).toEqual([{ writeback: true, output: path.join(root, 'out') }]);
    expect(sdCardDestination(sources[0])).toEqual({
      destination: path.join(root, 'out'),
      format: 'files',
    });
  });

  test('--sdcard-out <part>=<path> targets a specific card', () => {
    mkdirSync(path.join(root, 'a'));
    mkdirSync(path.join(root, 'b'));
    const sources = resolveSDCards({
      rootDir: root,
      cwd: root,
      flags: { sdcard: ['sd1=a', 'sd2=b'], sdcardOut: ['sd2=b-out'] },
    });
    expect(sources[0]).toEqual({ part: 'sd1', folder: path.join(root, 'a'), writeback: false });
    expect(sources[1]).toEqual({
      part: 'sd2',
      folder: path.join(root, 'b'),
      writeback: true,
      output: path.join(root, 'b-out'),
    });
    expect(() =>
      resolveSDCards({
        rootDir: root,
        cwd: root,
        flags: { sdcard: ['sd1=a'], sdcardOut: ['sd9=x'] },
      }),
    ).toThrow(/no SD card configured for part "sd9"/);
  });

  test('rejects missing sources, duplicate parts and multiple unqualified cards', () => {
    expect(() =>
      resolveSDCards({ rootDir: root, cwd: root, flags: { sdcard: ['missing'] } }),
    ).toThrow(/SD card source not found/);
    mkdirSync(path.join(root, 'a'));
    mkdirSync(path.join(root, 'b'));
    expect(() =>
      resolveSDCards({ rootDir: root, cwd: root, flags: { sdcard: ['a', 'b'] } }),
    ).toThrow(/Multiple SD card sources without a part id/);
    expect(() =>
      resolveSDCards({ rootDir: root, cwd: root, flags: { sdcard: ['sd1=a', 'sd1=b'] } }),
    ).toThrow(/Duplicate SD card configuration/);
    expect(() =>
      resolveSDCards({ rootDir: root, cwd: root, flags: { sdcard: ['a'], sdcardSize: '1M' } }),
    ).toThrow(/too small/);
  });
});
