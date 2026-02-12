import { type APIClient } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import { type TestScenario } from '../TestScenario.js';
import { type ITouchPointParams } from './TouchPressCommand.js';

export class TouchMoveCommand {
  validate(params: ITouchPointParams) {
    if (!params['part-id']) {
      throw new Error('touch-move: missing required parameter `part-id`');
    }
    if (typeof params.x !== 'number') {
      throw new Error('touch-move: missing required parameter `x`');
    }
    if (typeof params.y !== 'number') {
      throw new Error('touch-move: missing required parameter `y`');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ITouchPointParams) {
    scenario.log(
      chalkTemplate`touch-move {yellow ${params['part-id']}} to ({yellow ${String(params.x)}}, {yellow ${String(params.y)}})`,
    );
    await client.touchEvent(params['part-id'], params.x, params.y, 'move');
  }
}
