import chalk from 'chalk';
import type { APIClient } from '../APIClient';
import type { IScenarioCommand, TestScenario } from '../TestScenario';

export interface IExpectPinParams {
  'part-id': string;
  pin: string;
  value: number;
}

export class ExpectPinCommand implements IScenarioCommand {
  async run(scenario: TestScenario, client: APIClient, params: IExpectPinParams) {
    const partId = params['part-id'];
    const pinName = params.pin;
    const expectedValue = params.value;
    scenario.log(
      chalk`expect-pin {yellow ${partId}}:{magenta ${pinName}} == {yellow ${expectedValue}}`
    );
    const value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    if (value !== expectedValue) {
      scenario.fail(
        chalk`GPIO {yellow ${partId}}:{magenta ${pinName}} expected to be {yellow ${expectedValue}} but was {red ${value}}`
      );
    }
  }
}
