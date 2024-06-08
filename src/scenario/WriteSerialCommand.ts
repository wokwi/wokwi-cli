import type { APIClient } from '../APIClient.js';
import type { IScenarioCommand, TestScenario } from '../TestScenario.js';

const encoder = new TextEncoder();

export class WriteSerialCommand implements IScenarioCommand {
  validate(value: string | number[]) {
    if (value instanceof Array) {
      if (value.length === 0) {
        throw new Error(`Array must contain at least one number`);
      }
      if (value.some((v) => typeof v !== 'number')) {
        throw new Error(`Array must contain only numbers`);
      }
      return;
    }
    if (typeof value !== 'string') {
      throw new Error(`Value must be a string or an array of numbers`);
    }
  }

  async run(scenario: TestScenario, client: APIClient, text: string | number[]) {
    const data = text instanceof Array ? new Uint8Array(text) : encoder.encode(text);
    await client.serialMonitorWrite(data);
    await scenario.resume();
  }
}
