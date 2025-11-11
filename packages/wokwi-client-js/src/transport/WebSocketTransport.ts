import { WebSocket } from 'ws';
import { ITransport } from './ITransport.js';

const retryDelays = [1000, 2000, 5000, 10000, 20000];

enum ErrorStatus {
  RequestTimeout = 408,
  ServiceUnavailable = 503,
  CfRequestTimeout = 524,
}

/**
 * Transport for communicating with a Wokwi Simulator over a WebSocket.
 * This can be used in Node.js to communicate with the Wokwi CLI.
 */
export class WebSocketTransport implements ITransport {
  public onMessage: (message: any) => void = () => {};
  public onClose?: (code: number, reason?: string) => void;
  public onError?: (error: Error) => void;

  private socket: WebSocket;
  private connectionAttempts = 0;
  
  // to suppress close events when intentionally closing
  private ignoreClose = false;  
  
  // retryable error statuses
  private readonly errorStates = [ 
    ErrorStatus.RequestTimeout,
    ErrorStatus.ServiceUnavailable,
    ErrorStatus.CfRequestTimeout,
  ];

  constructor(
    private readonly token: string,
    private readonly server: string,
    private readonly version: string,
    private readonly sha: string
  ) {
    this.socket = this.createSocket();
  }

  private createSocket(): WebSocket {
    return new WebSocket(this.server, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': `wokwi-cli/${this.version} (${this.sha})`,
      },
    });
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        this.socket.on('message', (data) => {
          let dataStr: string;
          if (typeof data === 'string') {
            dataStr = data;
          } else if (Buffer.isBuffer(data)) {
            dataStr = data.toString('utf-8');
          } else {
            dataStr = Buffer.from(data as ArrayBuffer).toString('utf-8');
          }
          const messageObj = JSON.parse(dataStr);
          this.onMessage(messageObj);
        });
        this.socket.on('close', (code, reason) => {
          if (!this.ignoreClose) {
            this.onClose?.(code, reason?.toString());
          }
          this.ignoreClose = false;
        });
        resolve();
      };

      const handleError = (err: Error) => {
        cleanup();
        reject(new Error(`Error connecting to ${this.server}: ${err.message}`));
      };

      const handleUnexpected = (_req: any, res: any) => {
        cleanup();
        const statusCode = res.statusCode;
        const statusMsg = res.statusMessage ?? '';
        // Decide whether to retry based on the status code
        if (this.errorStates.includes(statusCode)) {
          const delay = retryDelays[this.connectionAttempts++];
          if (delay != null) {
            console.warn(`Connection to ${this.server} failed: ${statusMsg} (${statusCode}).`);
            console.log(`Will retry in ${delay}ms...`);
            this.ignoreClose = true;
            this.socket.close();
            setTimeout(() => {
              console.log(`Retrying connection to ${this.server}...`);
              this.socket = this.createSocket();
              this.connect().then(resolve).catch(reject);
            }, delay);
            return;
          }
          reject(new Error(`Failed to connect to ${this.server}. Giving up.`));
        } else {
          reject(new Error(`Error connecting to ${this.server}: ${statusCode} ${statusMsg}`));
        }
      };

      // remove handlers after success/failure to avoid leaks
      const cleanup = () => {
        this.socket.off('open', handleOpen);
        this.socket.off('error', handleError);
        this.socket.off('unexpected-response', handleUnexpected);
      };

      // attach handlers for this connection attempt
      this.socket.on('open', handleOpen);
      this.socket.on('error', handleError);
      this.socket.on('unexpected-response', handleUnexpected);
    });
  }

  send(message: any): void {
    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.ignoreClose = true;
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    } else {
      this.socket.terminate();
    }
  }
}
