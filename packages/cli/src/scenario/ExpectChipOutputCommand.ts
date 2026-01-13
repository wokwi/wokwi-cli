import type { APIClient } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

export class ExpectChipOutputCommand implements IScenarioCommand {
  async run(scenario: TestScenario, client: APIClient, text: string) {
    await client.waitForChipOutput(text);
    scenario.log(chalkTemplate`Expected chip output matched: {green "${text}"}`);
  }
}
