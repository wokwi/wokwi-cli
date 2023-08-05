import chalkTemplate from "chalk-template";
import type { APIClient } from "../APIClient.js";
import type { ExpectEngine } from "../ExpectEngine.js";
import type { IScenarioCommand, TestScenario } from "../TestScenario.js";
import { promiseAndResolver } from "../utils/promise.js";

export class WaitSerialCommand implements IScenarioCommand {
  constructor(readonly expectEngine: ExpectEngine) {}

  async run(scenario: TestScenario, client: APIClient, text: string) {
    this.expectEngine.expectTexts.push(text);
    const { promise, resolve } = promiseAndResolver();
    this.expectEngine.once("match", () => {
      scenario.log(chalkTemplate`Expected text matched: {green "${text}"}`);
      const textIndex = this.expectEngine.expectTexts.indexOf(text);
      if (textIndex >= 0) {
        this.expectEngine.expectTexts.splice(textIndex, 1);
      }
      resolve();
    });
    await Promise.all([scenario.resume(), promise]);
  }
}
