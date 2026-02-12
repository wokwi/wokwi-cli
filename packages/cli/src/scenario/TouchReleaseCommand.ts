import { type APIClient } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import { type TestScenario } from '../TestScenario.js';

export interface ITouchReleaseParams {
  'part-id': string;
}

export class TouchReleaseCommand {
  validate(params: ITouchReleaseParams) {
    if (!params['part-id']) {
      throw new Error('touch-release: missing required parameter `part-id`');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ITouchReleaseParams) {
    scenario.log(chalkTemplate`touch-release {yellow ${params['part-id']}}`);
    await client.touchEvent(params['part-id'], 0, 0, 'release');
  }
}
