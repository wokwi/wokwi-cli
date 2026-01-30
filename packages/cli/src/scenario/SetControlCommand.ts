import { type APIClient } from '@wokwi/client';
import { type TestScenario } from '../TestScenario.js';

export interface ISetControlParams {
  'part-id': string;
  /** The control name. */
  name?: string;
  /** @deprecated Use `name` instead. Kept for backward compatibility. */
  control?: string;
  value: number;
}

export class SetControlCommand {
  validate(params: ISetControlParams) {
    if (!params.name && !params.control) {
      throw new Error('set-control: missing required parameter `name`');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ISetControlParams) {
    const controlName = (params.name ?? params.control)!;
    await client.controlSet(params['part-id'], controlName, params.value);
  }
}
