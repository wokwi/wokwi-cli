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
} from './APITypes';

const DEFAULT_SERVER = process.env.WOKWI_CLI_SERVER ?? 'wss://wokwi.com/api/ws/beta';
const retryDelays = [1000, 2000, 5000, 10000, 20000];

export class APIClient {
  private socket: WebSocket;
  private connectionAttempts = 0;
  private lastId = 0;
  private _running = false;
  private _lastNanos = 0;
  private readonly pendingCommands = new Map<
    string,
    [(result: any) => void, (error: Error) => void]
  >();

  readonly connected;

  onConnected?: (helloMessage: APIHello) => void;
  onEvent?: (event: APIEvent) => void;

  constructor(readonly token: string, readonly server = DEFAULT_SERVER) {
    this.socket = this.createSocket(token, server);
    this.connected = this.connectSocket(this.socket);
  }

  private createSocket(token: string, server: string) {
    return new WebSocket(server, { headers: { Authorization: `Bearer ${token}` } });
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
        this.socket.close();
        const RequestTimeout = 408;
        const ServiceUnavailable = 503;
        if (res.statusCode === ServiceUnavailable || res.statusCode === RequestTimeout) {
          console.warn(
            `Connection to ${this.server} failed: ${res.statusMessage ?? ''} (${res.statusCode}).`
          );
          resolve(this.retryConnection());
        } else {
          reject(
            new Error(
              `Error connecting to ${this.server}: ${res.statusCode} ${res.statusMessage ?? ''}`
            )
          );
        }
      });
      this.socket.addEventListener('error', (event) => {
        reject(new Error(`Error connecting to ${this.server}: ${event.message}`));
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
    return await this.sendCommand('serial-monitor:write', { bytes: Array.from(bytes) });
  }

  async framebufferRead(partId: string) {
    return await this.sendCommand<{ png: string }>('framebuffer:read', { id: partId });
  }

  async controlSet(partId: string, control: string, value: number) {
    return await this.sendCommand('control:set', { part: partId, control, value });
  }

  async pinRead(partId: string, pin: string) {
    return await this.sendCommand<PinReadResponse>('pin:read', { part: partId, pin });
  }

  async sendCommand<T = unknown>(command: string, params?: any) {
    return await new Promise<T>((resolve, reject) => {
      const id = this.lastId++;
      this.pendingCommands.set(id.toString(), [resolve, reject]);
      const message: APICommand = { type: 'command', command, params, id: id.toString() };
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
        console.error('API Error:', message.message);
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
    }
    this._lastNanos = message.nanos;
    this.onEvent?.(message);
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
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}
