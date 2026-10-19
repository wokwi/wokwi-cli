import type { APIClient, APIEvent, HeapMonitorParams, HeapSamplePayload } from '@wokwi/client';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { stripVTControlCharacters } from 'util';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { HeapMonitor } from './heapMonitor.js';

function fakeClient() {
  const listeners: Array<(event: APIEvent<HeapSamplePayload>) => void> = [];
  const monitorCalls: HeapMonitorParams[] = [];
  const client = {
    listen: (_event: string, listener: (event: APIEvent<HeapSamplePayload>) => void) => {
      listeners.push(listener);
      return () => {};
    },
    heapMonitor: async (params: HeapMonitorParams) => {
      monitorCalls.push(params);
    },
  } as unknown as APIClient;
  const emit = (payload: HeapSamplePayload, nanos: number) => {
    for (const listener of listeners) {
      listener({ type: 'event', event: 'heap:sample', payload, nanos, paused: false });
    }
  };
  return { client, emit, monitorCalls };
}

describe('HeapMonitor', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'wokwi-heap-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('fails once the free heap drops below the limit, with every sample in the CSV', async () => {
    const { client, emit, monitorCalls } = fakeClient();
    const csvFile = path.join(root, 'heap.csv');
    const monitor = new HeapMonitor({
      intervalNanos: 500_000_000,
      minFree: 900,
      csvFile,
      quiet: true,
    });
    const run = monitor.run(client);
    emit({ part: 'esp', free: 1000, minFree: 990 }, 500_000_000);
    emit({ part: 'esp', free: 800, minFree: 790 }, 1_000_000_000);

    await expect(run).rejects.toThrow('free heap 800 dropped below 900 bytes at 1.000s');
    expect(monitorCalls).toEqual([{ intervalNanos: 500_000_000 }]);
    expect(readFileSync(csvFile, 'utf-8')).toBe(
      'part,time_s,free,min_free\nesp,0.500,1000,990\nesp,1.000,800,790\n',
    );
    expect(monitor.summary()).toBe(
      'Heap: 2 samples, free 1000 -> 800, lowest 790, 400 bytes/s lost',
    );
  });

  test('prints a sample only when the free heap changes', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { client, emit } = fakeClient();
    void new HeapMonitor({ intervalNanos: 500_000_000, quiet: false }).run(client);
    emit({ part: 'esp', free: 1000, minFree: 1000 }, 500_000_000);
    emit({ part: 'esp', free: 1000, minFree: 1000 }, 1_000_000_000);
    emit({ part: 'esp', free: 900, minFree: 900 }, 1_500_000_000);
    emit({ part: 'esp', free: 900, minFree: 900 }, 2_000_000_000);

    expect(log.mock.calls.map(([line]) => stripVTControlCharacters(String(line)))).toEqual([
      '[heap esp] 0.500s free=1000 min=1000',
      '[heap esp] 1.500s free=900 min=900',
    ]);
    log.mockRestore();
  });

  test('fails when the server cannot decode the heap', async () => {
    const { client, emit } = fakeClient();
    const run = new HeapMonitor({ intervalNanos: 1_000_000, quiet: true }).run(client);
    emit({ part: 'esp', error: 'Unrecognized ESP-IDF heap layout at 0x3fc90000' }, 1_000_000);

    await expect(run).rejects.toThrow(
      'cannot read the heap of esp: Unrecognized ESP-IDF heap layout at 0x3fc90000',
    );
  });
});
