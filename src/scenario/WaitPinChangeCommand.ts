import chalkTemplate from 'chalk-template';
import type { APIClient } from '../APIClient.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

export interface IExpectPinParams {
  'part-id': string;
  pin: string;
  value: number;
}

export class WaitPinChangeCommand implements IScenarioCommand {
  async run(scenario: TestScenario, client: APIClient, params: IExpectPinParams) {
    const partId = params['part-id'];
    const pinName = params.pin;
    const initalValue = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    scenario.log(
      chalkTemplate`wait-pin-toggle {yellow ${partId}}:{magenta ${pinName}} to change from {yellow ${initalValue}}`,
    );
    let value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    while (value == initalValue) {
      value = (await client.pinRead(partId, pinName))?.value ? 1 : 0;
    }
  }
}
