import { EventEmitter } from 'events';
import { createServer, type Server, type Socket } from 'net';

/**
 * Local TCP endpoint for gdb. Bytes are relayed unparsed in both directions: the simulator does
 * the GDB remote-protocol framing, so gdb sees a plain remote stub on `localhost:<port>`.
 */
export class GDBServer extends EventEmitter<{
  connected: [];
  disconnected: [];
  data: [Uint8Array];
  error: [Error];
}> {
  private readonly server: Server;
  private client: Socket | null = null;

  constructor() {
    super();
    this.server = createServer((socket) => this.handleConnection(socket));
    this.server.on('error', (err) => this.emit('error', err));
  }

  listen(port: number) {
    this.server.listen(port);
  }

  write(bytes: Uint8Array) {
    this.client?.write(bytes);
  }

  dispose() {
    this.client?.destroy();
    this.server.close();
  }

  handleConnection(socket: Socket) {
    if (this.client) {
      socket.destroy();
      return;
    }
    this.client = socket;
    socket.setNoDelay(true);
    this.emit('connected');
    socket.on('data', (data) => this.emit('data', new Uint8Array(data)));
    socket.on('error', (err) => this.emit('error', err));
    socket.on('close', () => {
      this.client = null;
      this.emit('disconnected');
    });
  }
}
