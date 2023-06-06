import chalk from 'chalk';
import type { APIClient } from './APIClient';
import type { EventManager } from './EventManager';
import type { ExpectEngine } from './ExpectEngine';
import { parseTime } from './utils/parseTime';

const validStepKeys = ['name'];

export interface ISetControlParams {
  'part-id': string;
  control: string;
  value: number;
}

export interface IStepDefinition {
  name?: string;
  'wait-serial': string;
  delay: string;
  'set-control': ISetControlParams;
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

  constructor(
    readonly scenario: IScenarioDefinition,
    readonly eventManager: EventManager,
    readonly expectEngine: ExpectEngine
  ) {}

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
    await this.nextStep();
  }

  async nextStep() {
    if (this.client?.running) {
      void this.client.simPause();
    }

    const step = this.scenario.steps[this.stepIndex];
    if (step == null) {
      this.log(chalk`{green Scenario completed successfully}`);
      process.exit(0);
    }
    if (step.name) {
      this.log(chalk`{gray Executing step:} {yellow ${step.name}`);
    }
    for (const key of Object.keys(this.handlers) as Array<keyof typeof this.handlers>) {
      if (key in step) {
        const value = step[key];
        console.log('running handler for ' + key);
        void this.handlers[key](value as any, step);
        this.stepIndex++;
        return;
      }
    }
    console.error('Unknown key in step: ', step);
    process.exit(1);
  }

  log(message: string) {
    console.log(chalk`{cyan [${this.scenario.name}]}`, message);
  }

  async resume() {
    await this.client?.simResume(
      this.eventManager.timeToNextEvent >= 0 ? this.eventManager.timeToNextEvent : undefined
    );
  }

  handlers = {
    'wait-serial': async (text: string) => {
      this.expectEngine.expectTexts.push(text);
      this.expectEngine.once('match', () => {
        this.log(chalk`Expected text matched: {green "${text}"}`);
        const textIndex = this.expectEngine.expectTexts.indexOf(text);
        if (textIndex >= 0) {
          this.expectEngine.expectTexts.splice(textIndex, 1);
        }
        void this.nextStep();
      });
      await this.resume();
    },
    delay: async (value: string, step: IStepDefinition) => {
      const nanos = parseTime(value);
      const targetNanos = (this.client?.lastNanos ?? 0) + nanos;
      this.log(chalk`delay {yellow "${value}"}`);
      this.eventManager.at(targetNanos, () => {
        void this.nextStep();
      });
      await this.resume();
    },
    'set-control': async (params: ISetControlParams) => {
      await this.client?.controlSet(params['part-id'], params.control, params.value);
      await this.nextStep();
    },
  };
}
