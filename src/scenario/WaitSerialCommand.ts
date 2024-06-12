import chalkTemplate from 'chalk-template';
import type { APIClient } from '../APIClient.js';
import type { ExpectEngine } from '../ExpectEngine.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';
import { promiseAndResolver } from '../utils/promise.js';

export class WaitSerialCommand implements IScenarioCommand {
  readonly buffer: string[] = [];

  constructor(readonly expectEngine: ExpectEngine) {
    expectEngine.on('line', (line) => {
      this.buffer.push(line);
    });
  }

  async run(scenario: TestScenario, client: APIClient, text: string) {
    for (let i = 0; i < this.buffer.length; i++) {
      const line = this.buffer[i];
      if (line.includes(text)) {
        this.buffer.splice(0, i + 1);
        scenario.log(chalkTemplate`Expected text matched: {green "${text}"}`);
        return;
      }
    }

    this.expectEngine.expectTexts.push(text);
    const { promise, resolve } = promiseAndResolver();
    this.expectEngine.once('match', () => {
      scenario.log(chalkTemplate`Expected text matched: {green "${text}"}`);
      const textIndex = this.expectEngine.expectTexts.indexOf(text);
      if (textIndex >= 0) {
        this.expectEngine.expectTexts.splice(textIndex, 1);
      }
      this.buffer.length = 0;
      resolve();
    });
    await Promise.all([scenario.resume(), promise]);
  }
}
