import EventEmitter from 'events';
import { describe, expect, it, vi } from 'vitest';
import { ControlCode, RFC2217Socket } from './RFC2217Socket.js';

function createMockSocket() {
  return Object.assign(new EventEmitter(), {
    write: vi.fn(),
    end: vi.fn(),
    setNoDelay: vi.fn(),
  });
}

function feedBytes(socket: EventEmitter, bytes: number[]) {
  socket.emit('data', Buffer.from(bytes));
}

describe('RFC2217Socket', () => {
  it('should emit data events for regular bytes', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);
    const received: number[] = [];
    rfc.on('data', (byte) => received.push(byte));

    feedBytes(socket, [0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    expect(received).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  });

  it('should emit a single 0xff byte for IAC IAC escape', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);
    const received: number[] = [];
    rfc.on('data', (byte) => received.push(byte));

    feedBytes(socket, [0x41, 0xff, 0xff, 0x42]); // A, IAC IAC, B
    expect(received).toEqual([0x41, 0xff, 0x42]);
  });

  it('should emit control event for SET_CONTROL subnegotiation', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);
    const controls: number[] = [];
    rfc.on('control', (code) => controls.push(code));

    // IAC SB COM_PORT SET_CONTROL DTR_ON IAC SE
    feedBytes(socket, [0xff, 0xfa, 44, 0x05, ControlCode.DTR_ON, 0xff, 0xf0]);
    expect(controls).toEqual([ControlCode.DTR_ON]);
  });

  it('should send acknowledgment after subnegotiation', () => {
    const socket = createMockSocket();
    new RFC2217Socket(socket as any);

    // IAC SB COM_PORT SET_CONTROL DTR_ON IAC SE
    feedBytes(socket, [0xff, 0xfa, 44, 0x05, ControlCode.DTR_ON, 0xff, 0xf0]);

    // Response option code = SET_CONTROL (0x05) + 0x64 = 0x69
    expect(socket.write).toHaveBeenCalledWith(
      Buffer.from([0xff, 0xfa, 44, 0x69, ControlCode.DTR_ON, 0xff, 0xf0]),
    );
  });

  it('should parse SET_BAUDRATE and update baudrate property', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);
    const configs: { name: string; value: number }[] = [];
    rfc.on('config', (name, value) => configs.push({ name, value }));

    // baudrate 115200 = 0x0001C200
    feedBytes(socket, [0xff, 0xfa, 44, 0x01, 0x00, 0x01, 0xc2, 0x00, 0xff, 0xf0]);
    expect(configs).toEqual([{ name: 'baudrate', value: 115200 }]);
    expect(rfc.baudrate).toBe(115200);
  });

  it('should emit purge event', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);
    let purged = false;
    rfc.on('purge', () => {
      purged = true;
    });

    feedBytes(socket, [0xff, 0xfa, 44, 0x0c, 0xff, 0xf0]);
    expect(purged).toBe(true);
  });

  it('should escape IAC bytes when writing', () => {
    const socket = createMockSocket();
    const rfc = new RFC2217Socket(socket as any);

    rfc.write(0x42);
    expect(socket.write).toHaveBeenCalledWith(Buffer.from([0x42]));

    rfc.write(0xff);
    expect(socket.write).toHaveBeenCalledWith(Buffer.from([0xff, 0xff]));
  });

  it('should respond to WILL COM_PORT with DO COM_PORT', () => {
    const socket = createMockSocket();
    new RFC2217Socket(socket as any);

    feedBytes(socket, [0xff, 0xfb, 44]);
    expect(socket.write).toHaveBeenCalledWith(Buffer.from([0xff, 0xfd, 44]));
  });
});
