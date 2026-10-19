import type { APIClient, APIEvent, HeapSamplePayload } from '@wokwi/client';
import chalkTemplate from 'chalk-template';
import { appendFileSync, writeFileSync } from 'fs';

export interface HeapMonitorOptions {
  intervalNanos: number;
  minFree?: number;
  /** Every sample is appended here as it arrives, so a failed run keeps its data */
  csvFile?: string;
  quiet: boolean;
}

interface HeapSample {
  part: string;
  nanos: number;
  free: number;
  minFree: number;
}

const seconds = (nanos: number) => (nanos / 1e9).toFixed(3);

/**
 * Follows the ESP-IDF heap of the primary board. The server samples the heap allocator's own
 * counters on the simulation clock, so the firmware needs no logging code and the run never pauses.
 */
export class HeapMonitor {
  private readonly samples: HeapSample[] = [];

  constructor(private readonly options: HeapMonitorOptions) {}

  /** Never resolves; rejects when the free heap drops below `minFree` or cannot be decoded */
  async run(client: APIClient): Promise<never> {
    const { options } = this;
    if (options.csvFile) {
      writeFileSync(options.csvFile, 'part,time_s,free,min_free\n');
    }
    const failure = new Promise<never>((_, reject) => {
      client.listen('heap:sample', (event: APIEvent<HeapSamplePayload>) => {
        const { payload } = event;
        if ('error' in payload) {
          reject(new Error(`cannot read the heap of ${payload.part}: ${payload.error}`));
          return;
        }
        const previous = this.samples[this.samples.length - 1];
        const sample = { ...payload, nanos: event.nanos };
        this.samples.push(sample);
        const time = seconds(sample.nanos);
        if (options.csvFile) {
          appendFileSync(
            options.csvFile,
            `${sample.part},${time},${sample.free},${sample.minFree}\n`,
          );
        }
        // A steady heap prints one line, every change prints another; the CSV keeps every sample
        if (!options.quiet && sample.free !== previous?.free) {
          console.log(
            chalkTemplate`{cyan [heap ${sample.part}]} ${time}s free=${sample.free} min=${sample.minFree}`,
          );
        }
        if (options.minFree != null && sample.free < options.minFree) {
          reject(
            new Error(
              `free heap ${sample.free} dropped below ${options.minFree} bytes at ${time}s`,
            ),
          );
        }
      });
    });
    await client.heapMonitor({ intervalNanos: options.intervalNanos });
    return await failure;
  }

  summary() {
    if (this.samples.length === 0) {
      return 'Heap: no samples (is the firmware built on ESP-IDF?)';
    }
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const lowest = Math.min(...this.samples.map((sample) => sample.minFree));
    const elapsed = (last.nanos - first.nanos) / 1e9;
    const rate =
      elapsed > 0 ? `, ${Math.round((first.free - last.free) / elapsed)} bytes/s lost` : '';
    return `Heap: ${this.samples.length} samples, free ${first.free} -> ${last.free}, lowest ${lowest}${rate}`;
  }
}
