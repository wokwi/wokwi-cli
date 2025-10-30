import { Writable } from 'stream';
import { WebSocket } from 'ws';
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
import { readVersion } from './readVersion.js';

const DEFAULT_SERVER = process.env.WOKWI_CLI_SERVER ?? 'wss://wokwi.com/api/ws/beta';
const retryDelays = [1000, 2000, 5000, 10000, 20000];

export class APIClient {
  private socket: WebSocket;
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

  readonly connected;

  onConnected?: (helloMessage: APIHello) => void;
  onError?: (error: APIError) => void;

  constructor(
    readonly token: string,
    readonly server = DEFAULT_SERVER,
  ) {
    this.socket = this.createSocket(token, server);
    this.connected = this.connectSocket(this.socket);
  }

  private createSocket(token: string, server: string) {
    const { sha, version } = readVersion();
    return new WebSocket(server, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': `wokwi-cli/${version} (${sha})`,
      },
    });
  }

  private async connectSocket(socket: WebSocket) {
    await new Promise((resolve, reject) => {
      socket.addEventListener('message', ({ data }) => {
        if (typeof data === 'string') {
          const message = JSON.parse(data);
          this.processMessage(message);
        } else {
          console.error('Unsupported binary message');
        }
      });
      this.socket.addEventListener('open', resolve);
      this.socket.on('unexpected-response', (req, res) => {
        this.closed = true;
        this.socket.close();
        const RequestTimeout = 408;
        const ServiceUnavailable = 503;
        const CfRequestTimeout = 524;
        if (
          res.statusCode === ServiceUnavailable ||
          res.statusCode === RequestTimeout ||
          res.statusCode === CfRequestTimeout
        ) {
          console.warn(
            `Connection to ${this.server} failed: ${res.statusMessage ?? ''} (${res.statusCode}).`,
          );
          resolve(this.retryConnection());
        } else {
          reject(
            new Error(
              `Error connecting to ${this.server}: ${res.statusCode} ${res.statusMessage ?? ''}`,
            ),
          );
        }
      });
      this.socket.addEventListener('error', (event) => {
        reject(new Error(`Error connecting to ${this.server}: ${event.message}`));
      });
      this.socket.addEventListener('close', (event) => {
        if (this.closed) {
          return;
        }

        const message = `Connection to ${this.server} closed unexpectedly: code ${event.code}`;
        if (this.onError) {
          this.onError({ type: 'error', message });
        } else {
          console.error(message);
        }
      });
    });
  }

  private async retryConnection() {
    const delay = retryDelays[this.connectionAttempts++];
    if (delay == null) {
      throw new Error(`Failed to connect to ${this.server}. Giving up.`);
    }

    console.log(`Will retry in ${delay}ms...`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    console.log(`Retrying connection to ${this.server}...`);
    this.socket = this.createSocket(this.token, this.server);
    this.closed = false;
    await this.connectSocket(this.socket);
  }

  async fileUpload(name: string, content: string | ArrayBuffer) {
    if (typeof content === 'string') {
      return await this.sendCommand('file:upload', { name, text: content });
    } else {
      return await this.sendCommand('file:upload', {
        name,
        binary: Buffer.from(content).toString('base64'),
      });
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

  serialMonitorWritable() {
    return new Writable({
      write: (chunk, encoding, callback) => {
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
      this.socket.send(JSON.stringify(message));
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
          const [, reject] = this.pendingCommands.values().next().value;
          reject(new Error(message.message));
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
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}
