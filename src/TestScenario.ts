import chalkTemplate from 'chalk-template';
import type { APIClient } from './APIClient.js';
import type { EventManager } from './EventManager.js';

export interface IScenarioCommand {
  validate?(params: any): boolean;
  run(scenario: TestScenario, client: APIClient, params: any): Promise<void>;
}

const validStepKeys = ['name'];

export interface IStepDefinition {
  name?: string;
  [key: string]: any;
}

export interface IScenarioDefinition {
  name: string;
  version: number;
  author?: string;

  steps: IStepDefinition[];
}

export class TestScenario {
  private stepIndex = 0;
  private client?: APIClient;

  readonly handlers: Record<string, IScenarioCommand> = {};

  constructor(
    readonly scenario: IScenarioDefinition,
    readonly eventManager: EventManager,
  ) {}

  registerCommands(commands: Record<string, IScenarioCommand>) {
    Object.assign(this.handlers, commands);
  }

  validate() {
    const { scenario } = this;
    if (scenario.name == null) {
      throw new Error(`Scenario name is missing`);
    }

    if (typeof scenario.name !== 'string') {
      throw new Error(`Scenario name must be a string`);
    }

    if (scenario.version !== 1) {
      throw new Error(`Unsupported scenario version: ${scenario.version}`);
    }

    if (!Array.isArray(scenario.steps)) {
      throw new Error(`Scenario steps must be an array`);
    }

    for (const step of scenario.steps) {
      if (typeof step !== 'object') {
        throw new Error(`Scenario step must be an object`);
      }

      for (const key of Object.keys(step)) {
        if (!validStepKeys.includes(key) && !Object.keys(this.handlers).includes(key)) {
          throw new Error(`Invalid scenario step key: ${key}`);
        }
      }
    }
  }

  async start(client: APIClient) {
    this.stepIndex = 0;
    this.client = client;
    for (const step of this.scenario.steps) {
      if (client.running) {
        void client.simPause();
      }
      if (step.name) {
        this.log(chalkTemplate`{gray Executing step:} {yellow ${step.name}`);
      }
      await this.executeStep(client, step);
    }
    this.log(chalkTemplate`{green Scenario completed successfully}`);
    process.exit(0);
  }

  async executeStep(client: APIClient, step: IStepDefinition) {
    for (const key of Object.keys(this.handlers)) {
      if (key in step) {
        const value = step[key];
        await this.handlers[key].run(this, client, value);
        this.stepIndex++;
        return;
      }
    }
    console.error('Unknown key in step: ', step);
    process.exit(1);
  }

  log(message: string) {
    console.log(chalkTemplate`{cyan [${this.scenario.name}]}`, message);
  }

  fail(message: string) {
    throw new Error(`[${this.client?.lastNanos}ns] ${message}`);
  }

  async resume() {
    await this.client?.simResume(
      this.eventManager.timeToNextEvent >= 0 ? this.eventManager.timeToNextEvent : undefined,
    );
  }
}
