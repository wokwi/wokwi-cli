import chalkTemplate from 'chalk-template';
import type { APIClient } from '../APIClient.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

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
      chalkTemplate`expect-pin {yellow ${partId}}:{magenta ${pinName}} == {yellow ${expectedValue}}`,
    );
    const value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    if (value !== expectedValue) {
      scenario.fail(
        chalkTemplate`GPIO {yellow ${partId}}:{magenta ${pinName}} expected to be {yellow ${expectedValue}} but was {red ${value}}`,
      );
    }
  }
}
