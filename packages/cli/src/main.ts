import { runCLI } from './cli.js';
import { SimulationTimeoutError } from './SimulationTimeoutError.js';

runCLI().catch((err) => {
  if (err instanceof SimulationTimeoutError) {
    process.exit(err.exitCode);
  }
  console.error(err);
  process.exit(1);
});
