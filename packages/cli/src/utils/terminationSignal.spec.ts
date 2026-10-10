import { afterEach, describe, expect, test, vi } from 'vitest';
import { TERMINATION_SIGNALS, terminationSignal } from './terminationSignal.js';

describe('terminationSignal', () => {
  afterEach(() => {
    for (const signal of TERMINATION_SIGNALS) {
      process.removeAllListeners(signal);
    }
    vi.restoreAllMocks();
  });

  test('resolves with the first signal and stops listening for a clean shutdown', async () => {
    const pending = terminationSignal();
    expect(process.listenerCount('SIGTERM')).toBe(1);
    process.emit('SIGTERM', 'SIGTERM');
    await expect(pending).resolves.toBe('SIGTERM');
    expect(process.listeners('SIGTERM')).toHaveLength(1); // only the second-signal handler is left
  });

  test('a second signal exits immediately with the conventional code', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const pending = terminationSignal();
    process.emit('SIGINT', 'SIGINT');
    await pending;
    process.emit('SIGINT', 'SIGINT');
    expect(exit).toHaveBeenCalledWith(130);
  });
});
