import { runCLI } from './cli.js';
import { ExitCodeError } from './ExitCodeError.js';

runCLI().catch((err) => {
  if (err instanceof ExitCodeError) {
    process.exit(err.exitCode);
  }
  console.error(err);
  process.exit(1);
});
