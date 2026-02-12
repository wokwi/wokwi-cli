import { type APIClient } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import { type TestScenario } from '../TestScenario.js';
import { parseTime } from '../utils/parseTime.js';

export interface ITouchParams {
  'part-id': string;
  x: number;
  y: number;
  duration?: string;
  wait?: boolean;
}

export class TouchCommand {
  validate(params: ITouchParams) {
    if (!params['part-id']) {
      throw new Error('touch: missing required parameter `part-id`');
    }
    if (typeof params.x !== 'number') {
      throw new Error('touch: missing required parameter `x`');
    }
    if (typeof params.y !== 'number') {
      throw new Error('touch: missing required parameter `y`');
    }
  }

  async run(scenario: TestScenario, client: APIClient, params: ITouchParams) {
    const duration = parseTime(params.duration ?? '50ms');
    scenario.log(
      chalkTemplate`touch {yellow ${params['part-id']}} at ({yellow ${String(params.x)}}, {yellow ${String(params.y)}})`,
    );
    await client.touchEvent(params['part-id'], params.x, params.y, 'press', {
      releaseAfter: duration,
    });
    if (params.wait) {
      await client.delay(duration);
    }
  }
}
