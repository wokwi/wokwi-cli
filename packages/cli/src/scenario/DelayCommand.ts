import chalkTemplate from 'chalk-template';
import { type APIClient } from '@wokwi/client';
import { type TestScenario } from '../TestScenario.js';
import { parseTime } from '../utils/parseTime.js';

export class DelayCommand {
  validate(value: string) {
    if (typeof value === 'number') {
      throw new Error(
        `Invalid delay value ${value}. The value must include units (e.g. ${value}ms)`,
      );
    }
    if (typeof value !== 'string') {
      throw new Error(`Delay value must be a string`);
    }
  }

  async run(scenario: TestScenario, client: APIClient, value: string) {
    const nanos = parseTime(value);
    scenario.log(chalkTemplate`delay {yellow ${value}}`);
    await client.delay(nanos);
  }
}
