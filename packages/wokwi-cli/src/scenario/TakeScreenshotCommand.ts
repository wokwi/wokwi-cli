import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import { type APIClient } from '../APIClient.js';
import { type TestScenario } from '../TestScenario.js';

export interface ITakeScreenshotParams {
  'part-id': string;
  'save-to'?: string;
  'compare-with'?: string;
}

export class TakeScreenshotCommand {
  constructor(readonly scenarioDir: string) {}

  validate(value: ITakeScreenshotParams) {
    if (!value['part-id']) {
      throw new Error('take-screenshot: `part-id` is required');
    }
    if (!value['save-to'] && !value['compare-with']) {
      throw new Error('take-screenshot: `save-to` or `compare-with` is required');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ITakeScreenshotParams) {
    const framebuffer = await client.framebufferRead(params['part-id']);
    const png = Buffer.from(framebuffer.png, 'base64');
    const saveTo = params['save-to'];
    const compareWith = params['compare-with'];
    if (saveTo) {
      await writeFile(path.join(this.scenarioDir, saveTo), png);
    }
    if (compareWith) {
      const compareWithPath = path.join(this.scenarioDir, compareWith);
      const originalPng = PNG.sync.read(png);

      let compareWithData;
      try {
        compareWithData = await readFile(compareWithPath);
      } catch (error) {
        scenario.fail(`Failed to read comparison file for screenshot: ${compareWith}`);
        return;
      }

      const compareWithPng = PNG.sync.read(compareWithData);

      if (
        compareWithPng.width !== originalPng.width ||
        compareWithPng.height !== originalPng.height
      ) {
        scenario.fail(
          `Comparison file for screenshot (${compareWith}) has a different size (${compareWithPng.width}x${compareWithPng.height}) than the part's screen (${originalPng.width}x${originalPng.height})`,
        );
        return;
      }

      for (let i = 0; i < originalPng.data.length; i++) {
        const original = originalPng.data[i];
        const compare = compareWithPng.data[i];
        if (original !== compare) {
          const x = (i >> 2) % originalPng.width;
          const y = Math.floor((i >> 2) / originalPng.width);
          scenario.fail(`Screenshot mismatch for ${compareWith} at x,y=(${x},${y})`);
        }
      }
    }
  }
}
