import os from 'os';

/**
 * Signals that ask the process to stop. Windows delivers SIGINT (Ctrl+C), SIGBREAK (Ctrl+Break)
 * and SIGHUP (console closed); SIGTERM only arrives on POSIX systems.
 */
export const TERMINATION_SIGNALS: readonly NodeJS.Signals[] = [
  'SIGINT',
  'SIGTERM',
  'SIGHUP',
  'SIGBREAK',
];

/** The exit code a shell reports for a process ended by `signal` */
export function signalExitCode(signal: NodeJS.Signals) {
  return 128 + os.constants.signals[signal];
}

/**
 * Resolves with the first termination signal the process receives, so the caller can shut down
 * cleanly instead of being killed. A second signal exits immediately.
 */
export function terminationSignal() {
  return new Promise<NodeJS.Signals>((resolve) => {
    const onSignal = (signal: NodeJS.Signals) => {
      for (const other of TERMINATION_SIGNALS) {
        process.off(other, onSignal);
        process.once(other, (again) => process.exit(signalExitCode(again)));
      }
      resolve(signal);
    };
    for (const signal of TERMINATION_SIGNALS) {
      process.on(signal, onSignal);
    }
  });
}
