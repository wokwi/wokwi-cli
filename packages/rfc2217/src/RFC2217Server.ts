import EventEmitter from 'events';
import { createServer, Socket, type Server } from 'net';
import { ControlCode, RFC2217Socket } from './RFC2217Socket.js';

export interface IControlPinValues {
  rts: boolean;
  dtr: boolean;
}

export class RFC2217Server extends EventEmitter {
  readonly sockets = new Set<RFC2217Socket>();
  readonly server: Server;

  private rts: boolean = false;
  private dtr: boolean = false;
  private disposed = false;

  constructor() {
    super();
    this.server = createServer();
    this.server.on('connection', (socket) => this.handleConnection(socket));
    this.server.on('error', (e: Error) => {
      this.emit('error', e.toString());
    });
  }

  listen(port = 4000) {
    this.server.listen(port);
  }

  handleConnection(socket: Socket) {
    socket.setNoDelay(true);
    this.emit('connected');

    const rfc2217 = new RFC2217Socket(socket);
    this.sockets.add(rfc2217);

    rfc2217.on('data', (data) => {
      this.emit('data', new Uint8Array([data]));
    });

    rfc2217.on('control', (value) => {
      if (value === ControlCode.RTS_ON && !this.rts) {
        this.rts = true;
        this.controlUpdated();
      }
      if (value === ControlCode.RTS_OFF && this.rts) {
        this.rts = false;
        this.controlUpdated();
      }
      if (value === ControlCode.DTR_ON && !this.dtr) {
        this.dtr = true;
        this.controlUpdated();
      }
      if (value === ControlCode.DTR_OFF && this.dtr) {
        this.dtr = false;
        this.controlUpdated();
      }
    });

    socket.on('error', (err) => {
      console.error('RFC 2217 socket error', err);
    });

    socket.on('close', () => {
      this.sockets.delete(rfc2217);
    });
  }

  private controlUpdated() {
    this.emit('control', {
      rts: this.rts,
      dtr: this.dtr,
    });
  }

  write(byte: number) {
    for (const socket of this.sockets) {
      try {
        socket.write(byte);
      } catch (err) {
        console.warn(err);
        this.sockets.delete(socket);
      }
    }
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    for (const socket of this.sockets) {
      socket.close();
    }
    this.server.close();
    this.disposed = true;
  }
}
