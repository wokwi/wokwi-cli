import type {
  APICommand,
  APIError,
  APIEvent,
  APIHello,
  APIResponse,
  APIResultError,
  APISimStartParams,
  PinReadResponse,
} from './APITypes.js';
import { PausePoint, type PausePointParams } from './PausePoint.js';
import { ITransport } from './transport/ITransport.js';
import { base64ToByteArray, byteArrayToBase64 } from './base64.js';

export class APIClient {
  private connectionAttempts = 0;
  private lastId = 0;
  private lastPausePointId = 0;
  private closed = false;
  private _running = false;
  private _lastNanos = 0;
  private readonly apiEvents = new EventTarget();
  private readonly pausePoints = new Map<string, PausePoint>();
  private readonly pendingCommands = new Map<
    string,
    [(result: any) => void, (error: Error) => void]
  >();

  readonly connected: Promise<void>;

  onConnected?: (helloMessage: APIHello) => void;
  onError?: (error: APIError) => void;
  onEvent?: (event: APIEvent) => void;

  constructor(
    private readonly transport: ITransport,
  ) {
    this.transport.onMessage = (message) => { this.processMessage(message); };
    this.transport.onClose = (code, reason) => { this.handleTransportClose(code, reason); };
    this.transport.onError = (error) => { this.handleTransportError(error); };

    // Initiate connection
    this.connected = this.transport.connect();
  }

  async fileUpload(name: string, content: string | Uint8Array) {
    if (typeof content === 'string') {
      return await this.sendCommand('file:upload', { name, text: content });
    } else {
      return await this.sendCommand('file:upload', {
        name,
        binary: byteArrayToBase64(content),
      });
    }
  }

  async fileDownload(name: string): Promise<string | Uint8Array> {
    const result = await this.sendCommand<{ text?: string; binary?: string }>('file:download', { name });
    if (typeof result.text === 'string') {
      return result.text;
    } else if (typeof result.binary === 'string') {
      return base64ToByteArray(result.binary);
    } else {
      throw new Error('Invalid file download response');
    }
  }

  async simStart(params: APISimStartParams) {
    this._running = false;
    return await this.sendCommand('sim:start', params);
  }

  async simPause() {
    return await this.sendCommand('sim:pause');
  }

  async simResume(pauseAfter?: number) {
    this._running = true;
    return await this.sendCommand('sim:resume', { pauseAfter });
  }

  async simRestart({ pause }: { pause?: boolean } = {}) {
    return await this.sendCommand('sim:restart', { pause });
  }

  async simStatus() {
    return await this.sendCommand<{ running: boolean; nanos: number }>('sim:status');
  }

  async serialMonitorListen() {
    return await this.sendCommand('serial-monitor:listen');
  }

  async serialMonitorWrite(bytes: number[] | Uint8Array) {
    return await this.sendCommand('serial-monitor:write', {
      bytes: Array.from(bytes),
    });
  }

  get pausedPromise() {
    if (!this._running) {
      return Promise.resolve();
    }
    return new Promise<APIEvent<any>>((resolve) => {
      this.listen('sim:pause', resolve, { once: true });
    });
  }

  async serialMonitorWritable() {
    // Dynamic import for Node.js-only API
    const { Writable } = await import('stream');
    const { Buffer } = await import('buffer');
    return new Writable({
      write: (chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) => {
        if (typeof chunk === 'string') {
          chunk = Buffer.from(chunk, encoding);
        }
        this.serialMonitorWrite(chunk).then(() => {
          callback(null);
        }, callback);
      },
    });
  }

  async framebufferRead(partId: string) {
    return await this.sendCommand<{ png: string }>('framebuffer:read', {
      id: partId,
    });
  }

  async controlSet(partId: string, control: string, value: number) {
    return await this.sendCommand('control:set', {
      part: partId,
      control,
      value,
    });
  }

  async pinRead(partId: string, pin: string) {
    return await this.sendCommand<PinReadResponse>('pin:read', {
      part: partId,
      pin,
    });
  }

  async addPausePoint(params: PausePointParams, resume = false) {
    const id = `pp${this.lastPausePointId++}_${params.type}`;
    const commands = [this.sendCommand('pause-point:add', { id, ...params })];
    if (resume && !this._running) {
      commands.push(this.simResume());
      this._running = true;
    }
    const pausePoint = new PausePoint(id, params);
    this.pausePoints.set(id, pausePoint);
    await Promise.all(commands);
    return pausePoint;
  }

  async removePausePoint(pausePoint: PausePoint) {
    if (this.pausePoints.has(pausePoint.id)) {
      this.pausePoints.delete(pausePoint.id);
      await this.sendCommand('pause-point:remove', { id: pausePoint.id });
      return true;
    }
    return false;
  }

  async atNanos(nanos: number) {
    const pausePoint = await this.addPausePoint({ type: 'time-absolute', nanos });
    await pausePoint.promise;
  }

  async delay(nanos: number) {
    const pausePoint = await this.addPausePoint({ type: 'time-relative', nanos }, true);
    await pausePoint.promise;
  }

  async waitForSerialBytes(bytes: number[] | Uint8Array) {
    if (bytes instanceof Uint8Array) {
      bytes = Array.from(bytes);
    }
    const pausePoint = await this.addPausePoint({ type: 'serial-bytes', bytes }, true);
    await pausePoint.promise;
  }

  async sendCommand<T = unknown>(command: string, params?: any) {
    return await new Promise<T>((resolve, reject) => {
      const id = this.lastId++;
      this.pendingCommands.set(id.toString(), [resolve, reject]);
      const message: APICommand = {
        type: 'command',
        command,
        params,
        id: id.toString(),
      };
      this.transport.send(message);
    });
  }

  get running() {
    return this._running;
  }

  get lastNanos() {
    return this._lastNanos;
  }

  processMessage(message: APIError | APIHello | APIEvent | APIResponse) {
    switch (message.type) {
      case 'error':
        if (this.onError) {
          this.onError(message);
        }
        console.error('API Error:', message.message);
        if (this.pendingCommands.size > 0) {
          const entry = this.pendingCommands.values().next().value;
          if (entry) {
            const [, reject] = entry;
            reject(new Error(message.message));
          }
        }
        break;

      case 'hello':
        if (message.protocolVersion !== 1) {
          console.warn('Unsupported Wokwi API protocol version', message.protocolVersion);
        }
        this.onConnected?.(message);
        break;

      case 'event':
        this.processEvent(message);
        break;

      case 'response':
        this.processResponse(message);
        break;
    }
  }

  processEvent(message: APIEvent) {
    if (message.event === 'sim:pause') {
      this._running = false;
      const pausePointId: string = message.payload.pausePoint;
      const pausePoint = this.pausePoints.get(pausePointId);
      if (pausePoint) {
        pausePoint.resolve(message.payload.pausePointInfo);
        this.pausePoints.delete(pausePointId);
      }
    }
    this._lastNanos = message.nanos;
    this.onEvent?.(message);
    this.apiEvents.dispatchEvent(new CustomEvent<APIEvent>(message.event, { detail: message }));
  }

  listen(event: string, listener: (event: APIEvent) => void, options?: AddEventListenerOptions) {
    const callback = (e: CustomEventInit<APIEvent>) => {
      if (e.detail == null) {
        return;
      }
      listener(e.detail);
    };

    this.apiEvents.addEventListener(event, callback, options);
    return () => {
      this.apiEvents.removeEventListener(event, callback, options);
    };
  }

  processResponse(message: APIResponse) {
    const id = message.id ?? '';
    const [resolve, reject] = this.pendingCommands.get(id) ?? [];
    if (resolve && reject) {
      this.pendingCommands.delete(id);
      if (message.error) {
        const { result } = message as APIResponse<APIResultError>;
        reject(new Error(`Error ${result.code}: ${result.message}`));
      } else {
        resolve(message.result);
      }
    } else {
      console.error('Unknown response', message);
    }
  }

  close() {
    this.closed = true;
    this.transport.close();
  }

  private handleTransportClose(code: number, reason?: string) {
    if (this.closed) return;
    const target = (this as any).server ?? 'transport';
    const msg = `Connection to ${target} closed unexpectedly: code ${code}${reason ? ` (${reason})` : ''}`;
    const errorObj: APIError = { type: 'error', message: msg };
    this.onError?.(errorObj);
    console.error(msg);
  }

  private handleTransportError(error: Error) {
    const errorObj: APIError = { type: 'error', message: error.message };
    this.onError?.(errorObj);
    console.error('Transport error:', error.message);
  }
}
