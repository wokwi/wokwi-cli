import { ExitCodeError } from './ExitCodeError.js';

export class SimulationTimeoutError extends ExitCodeError {
  constructor(exitCode: number, message: string) {
    super(exitCode, message);
    this.name = 'SimulationTimeoutError';
  }
}
