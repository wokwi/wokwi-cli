import { ExitCodeError } from './ExitCodeError.js';
import { signalExitCode } from './utils/terminationSignal.js';

export class SimulationInterruptedError extends ExitCodeError {
  constructor(signal: NodeJS.Signals) {
    super(signalExitCode(signal), `simulation interrupted by ${signal}`);
    this.name = 'SimulationInterruptedError';
  }
}
