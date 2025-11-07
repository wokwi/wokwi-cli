import chalkTemplate from 'chalk-template';
import type { APIClient } from '../APIClient.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

const encoder = new TextEncoder();

export class WaitSerialCommand implements IScenarioCommand {
  async run(scenario: TestScenario, client: APIClient, text: string) {
    await client.waitForSerialBytes(encoder.encode(text));
    scenario.log(chalkTemplate`Expected text matched: {green "${text}"}`);
  }
}
