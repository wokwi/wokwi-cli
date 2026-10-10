import { describe, expect, it, vi } from 'vitest';
import {
  EspIdfBacktraceDecoder,
  extractBacktraceAddresses,
  type BacktraceCommandRunner,
} from './backtraceDecoder.js';

describe('extractBacktraceAddresses', () => {
  it('returns program counters without stack pointers', () => {
    expect(
      extractBacktraceAddresses('Backtrace: 0x40012345:0x3ffb1230 0x40067890:0x3ffb1250'),
    ).toEqual(['0x40012345', '0x40067890']);
  });

  it('ignores addresses outside a Backtrace line', () => {
    expect(extractBacktraceAddresses('PC: 0x40012345')).toEqual([]);
  });
});

describe('EspIdfBacktraceDecoder', () => {
  it('decodes a backtrace split across serial chunks', () => {
    const commandRunner: BacktraceCommandRunner = vi.fn((_command, _args, callback) => {
      callback(null, '0x40012345: app_main at main.c:12\n', '');
    });
    const onDecoded = vi.fn();
    const decoder = new EspIdfBacktraceDecoder(
      'xtensa-esp32-elf-addr2line',
      'build/hello_world.elf',
      { commandRunner, onDecoded },
    );

    decoder.write(new TextEncoder().encode('Backtr'));
    decoder.write(new TextEncoder().encode('ace: 0x40012345:0x3ffb1230 0x40067890:0x3ffb1250\r\n'));

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(commandRunner).toHaveBeenCalledWith(
      'xtensa-esp32-elf-addr2line',
      ['-pfiaC', '-e', 'build/hello_world.elf', '0x40012345', '0x40067890'],
      expect.any(Function),
    );
    expect(onDecoded).toHaveBeenCalledWith(
      'Decoded ESP-IDF backtrace:\n0x40012345: app_main at main.c:12',
    );
  });

  it('does not run addr2line for ordinary serial output', () => {
    const commandRunner: BacktraceCommandRunner = vi.fn();
    const decoder = new EspIdfBacktraceDecoder('addr2line', 'firmware.elf', { commandRunner });

    decoder.write(new TextEncoder().encode('booting at 0x40012345\r\n'));

    expect(commandRunner).not.toHaveBeenCalled();
  });

  it('warns once and keeps running when addr2line is unavailable', async () => {
    const commandRunner: BacktraceCommandRunner = vi.fn((_command, _args, callback) => {
      queueMicrotask(() => {
        callback(new Error('spawn addr2line ENOENT'), '', '');
      });
    });
    const onWarning = vi.fn();
    const decoder = new EspIdfBacktraceDecoder('addr2line', 'firmware.elf', {
      commandRunner,
      onWarning,
    });

    decoder.write(
      new TextEncoder().encode(
        'Backtrace: 0x40012345:0x3ffb1230\nBacktrace: 0x40067890:0x3ffb1250\n',
      ),
    );

    expect(commandRunner).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onWarning).toHaveBeenCalledTimes(1);

    decoder.write(new TextEncoder().encode('Backtrace: 0x400abcde:0x3ffb1270\n'));

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });
});
