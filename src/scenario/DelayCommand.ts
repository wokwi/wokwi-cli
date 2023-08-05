import chalkTemplate from "chalk-template";
import { type APIClient } from "../APIClient.js";
import { type EventManager } from "../EventManager.js";
import { type TestScenario } from "../TestScenario.js";
import { parseTime } from "../utils/parseTime.js";
import { promiseAndResolver } from "../utils/promise.js";

export class DelayCommand {
  constructor(readonly eventManager: EventManager) {}

  async run(scenario: TestScenario, client: APIClient, value: string) {
    const nanos = parseTime(value);
    const targetNanos = (client.lastNanos ?? 0) + nanos;
    scenario.log(chalkTemplate`delay {yellow ${value}}`);
    const delayPromise = promiseAndResolver();
    this.eventManager.at(targetNanos, () => {
      delayPromise.resolve();
    });
    await Promise.all([scenario.resume(), delayPromise.promise]);
  }
}
