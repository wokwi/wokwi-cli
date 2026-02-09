import EventEmitter from 'events';
import { describe, expect, it, vi } from 'vitest';
import { RFC2217Server } from './RFC2217Server.js';

function createMockSocket() {
  const socket = Object.assign(new EventEmitter(), {
    write: vi.fn(),
    end: vi.fn(),
    setNoDelay: vi.fn(),
  });
  return socket;
}

describe('RFC2217Server', () => {
  it('should forward data from sockets to data event', () => {
    const server = new RFC2217Server();
    const received: Uint8Array[] = [];
    server.on('data', (data) => received.push(data));

    const socket = createMockSocket();
    server.handleConnection(socket as any);

    socket.emit('data', Buffer.from([0x48, 0x65]));

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(new Uint8Array([0x48]));
    expect(received[1]).toEqual(new Uint8Array([0x65]));
  });

  it('should track DTR/RTS state and deduplicate control events', () => {
    const server = new RFC2217Server();
    const controls: { rts: boolean; dtr: boolean }[] = [];
    server.on('control', (values) => controls.push({ ...values }));

    const socket = createMockSocket();
    server.handleConnection(socket as any);

    // DTR_ON
    socket.emit('data', Buffer.from([0xff, 0xfa, 44, 0x05, 0x08, 0xff, 0xf0]));
    // DTR_ON again (should be deduplicated)
    socket.emit('data', Buffer.from([0xff, 0xfa, 44, 0x05, 0x08, 0xff, 0xf0]));
    // RTS_ON
    socket.emit('data', Buffer.from([0xff, 0xfa, 44, 0x05, 0x0b, 0xff, 0xf0]));
    // DTR_OFF
    socket.emit('data', Buffer.from([0xff, 0xfa, 44, 0x05, 0x09, 0xff, 0xf0]));

    expect(controls).toEqual([
      { rts: false, dtr: true },
      { rts: true, dtr: true },
      { rts: true, dtr: false },
    ]);
  });

  it('should broadcast write to all connected sockets', () => {
    const server = new RFC2217Server();

    const socket1 = createMockSocket();
    const socket2 = createMockSocket();
    server.handleConnection(socket1 as any);
    server.handleConnection(socket2 as any);

    server.write(0x42);

    expect(socket1.write).toHaveBeenCalledWith(Buffer.from([0x42]));
    expect(socket2.write).toHaveBeenCalledWith(Buffer.from([0x42]));
  });

  it('should remove socket on close', () => {
    const server = new RFC2217Server();

    const socket = createMockSocket();
    server.handleConnection(socket as any);
    expect(server.sockets.size).toBe(1);

    socket.emit('close');
    expect(server.sockets.size).toBe(0);
  });

  it('should dispose all sockets and server', () => {
    const server = new RFC2217Server();
    const serverClose = vi.fn(() => server.server);
    server.server.close = serverClose;

    const socket = createMockSocket();
    server.handleConnection(socket as any);

    server.dispose();

    expect(socket.end).toHaveBeenCalled();
    expect(serverClose).toHaveBeenCalled();
  });
});
