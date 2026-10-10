import type { APIClient } from '@wokwi/client';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { uploadSDCards } from './upload.js';

describe('uploadSDCards', () => {
  let root: string;
  let uploads: string[];
  let client: APIClient;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'wokwi-sdcard-upload-'));
    uploads = [];
    client = {
      fileUpload: async (name: string) => {
        uploads.push(name);
      },
    } as unknown as APIClient;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('uploads each card under names of its own, so earlier uploads never land on a later card', async () => {
    mkdirSync(path.join(root, 'first'));
    writeFileSync(path.join(root, 'first', 'a.txt'), 'a');
    mkdirSync(path.join(root, 'second'));
    writeFileSync(path.join(root, 'second', 'b.txt'), 'b');
    writeFileSync(path.join(root, 'card.img'), new Uint8Array(1024));

    const first = await uploadSDCards(
      client,
      [{ folder: path.join(root, 'first'), writeback: false }],
      root,
    );
    const second = await uploadSDCards(
      client,
      [
        { part: 'sd1', folder: path.join(root, 'second'), writeback: false },
        { part: 'sd2', image: path.join(root, 'card.img'), sizeBytes: 4096, writeback: false },
        { part: 'sd3', writeback: false },
      ],
      root,
    );

    const [firstPrefix] = first.params.map((param) => param.prefix);
    const [folderPrefix, , emptyPrefix] = second.params.map((param) => param.prefix);
    expect(uploads).toEqual([
      `${firstPrefix}a.txt`,
      `${folderPrefix}b.txt`,
      second.params[1].image,
    ]);
    expect(new Set([firstPrefix, folderPrefix, emptyPrefix]).size).toBe(3);
    expect(uploads.some((name) => name.startsWith(emptyPrefix!))).toBe(false);
    expect(second.params).toEqual([
      { part: 'sd1', sizeBytes: undefined, prefix: folderPrefix },
      { part: 'sd2', sizeBytes: 4096, image: second.params[1].image },
      { part: 'sd3', sizeBytes: undefined, prefix: emptyPrefix },
    ]);
    expect(second.summary).toEqual([
      'SD card "sd1": 1 file (1 bytes) from second',
      'SD card "sd2": image card.img (1 KB)',
      'SD card "sd3": empty card',
    ]);
  });
});
