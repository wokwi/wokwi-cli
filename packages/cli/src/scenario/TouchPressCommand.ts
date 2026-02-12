import { type APIClient } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import { type TestScenario } from '../TestScenario.js';

export interface ITouchPointParams {
  'part-id': string;
  x: number;
  y: number;
}

export class TouchPressCommand {
  validate(params: ITouchPointParams) {
    if (!params['part-id']) {
      throw new Error('touch-press: missing required parameter `part-id`');
    }
    if (typeof params.x !== 'number') {
      throw new Error('touch-press: missing required parameter `x`');
    }
    if (typeof params.y !== 'number') {
      throw new Error('touch-press: missing required parameter `y`');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ITouchPointParams) {
    scenario.log(
      chalkTemplate`touch-press {yellow ${params['part-id']}} at ({yellow ${String(params.x)}}, {yellow ${String(params.y)}})`,
    );
    await client.touchEvent(params['part-id'], params.x, params.y, 'press');
  }
}
