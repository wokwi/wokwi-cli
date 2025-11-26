import type { APIClient } from '@wokwi/client';
import { Writable } from 'stream';
import { Buffer } from 'buffer';

/**
 * Creates a Node.js Writable stream that forwards data to the serial monitor.
 * This function is Node.js-only and cannot be used in browser environments.
 */
export async function createSerialMonitorWritable(client: APIClient) {
  return new Writable({
    write: (chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) => {
      if (typeof chunk === 'string') {
        chunk = Buffer.from(chunk, encoding);
      }
      client.serialMonitorWrite(chunk).then(() => {
        callback(null);
      }, callback);
    },
  });
}
