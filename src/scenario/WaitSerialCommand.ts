import chalk from 'chalk';
import type { APIClient } from '../APIClient';
import type { ExpectEngine } from '../ExpectEngine';
import type { IScenarioCommand, TestScenario } from '../TestScenario';
import { promiseAndResolver } from '../utils/promise';

export class WaitSerialCommand implements IScenarioCommand {
  constructor(readonly expectEngine: ExpectEngine) {}

  async run(scenario: TestScenario, client: APIClient, text: string) {
    this.expectEngine.expectTexts.push(text);
    const { promise, resolve } = promiseAndResolver();
    this.expectEngine.once('match', () => {
      scenario.log(chalk`Expected text matched: {green "${text}"}`);
      const textIndex = this.expectEngine.expectTexts.indexOf(text);
      if (textIndex >= 0) {
        this.expectEngine.expectTexts.splice(textIndex, 1);
      }
      resolve();
    });
    await Promise.all([scenario.resume(), promise]);
  }
}
