import chalkTemplate from 'chalk-template';
import type { APIClient } from '../APIClient.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

export interface IExpectPinParams {
  'part-id': string;
  pin: string;
  value: number;
}

export class WaitPinCommand implements IScenarioCommand {
  async run(scenario: TestScenario, client: APIClient, params: IExpectPinParams) {
    const partId = params['part-id'];
    const pinName = params.pin;
    const expectedValue = params.value;
    scenario.log(
      chalkTemplate`wait-pin {yellow ${partId}}:{magenta ${pinName}} == {yellow ${expectedValue}}`,
    );
    let value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    while (value !== expectedValue) {
      value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    }
  }
}
