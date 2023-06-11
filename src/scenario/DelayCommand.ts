import chalk from 'chalk';
import { type APIClient } from '../APIClient';
import { type EventManager } from '../EventManager';
import { type TestScenario } from '../TestScenario';
import { parseTime } from '../utils/parseTime';
import { promiseAndResolver } from '../utils/promise';

export class DelayCommand {
  constructor(readonly eventManager: EventManager) {}

  async run(scenario: TestScenario, client: APIClient, value: string) {
    const nanos = parseTime(value);
    const targetNanos = (client.lastNanos ?? 0) + nanos;
    scenario.log(chalk`delay {yellow ${value}}`);
    const delayPromise = promiseAndResolver();
    this.eventManager.at(targetNanos, () => {
      delayPromise.resolve();
    });
    await Promise.all([scenario.resume(), delayPromise.promise]);
  }
}
