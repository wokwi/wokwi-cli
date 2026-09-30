import { execFile } from 'child_process';

export type BacktraceCommandRunner = (
  command: string,
  args: string[],
  callback: (error: Error | null, stdout: string, stderr: string) => void,
) => void;

interface BacktraceDecoderOptions {
  commandRunner?: BacktraceCommandRunner;
  onDecoded?: (output: string) => void;
  onWarning?: (message: string) => void;
}

const MAX_PENDING_LINE_LENGTH = 8 * 1024;

const runCommand: BacktraceCommandRunner = (command, args, callback) => {
  execFile(command, args, { encoding: 'utf8', windowsHide: true }, callback);
};

export function extractBacktraceAddresses(line: string): string[] {
  if (!/\bBacktrace\s*:/i.test(line)) {
    return [];
  }

  return Array.from(line.matchAll(/\b(0x[0-9a-f]+):0x[0-9a-f]+\b/gi), (match) => match[1]);
}

export class EspIdfBacktraceDecoder {
  private readonly textDecoder = new TextDecoder();
  private pendingLine = '';
  private disabled = false;
  private commandPending = false;
  private readonly pendingBacktraces: string[][] = [];
  private readonly commandRunner: BacktraceCommandRunner;
  private readonly onDecoded: (output: string) => void;
  private readonly onWarning: (message: string) => void;

  constructor(
    private readonly executable: string,
    private readonly elfPath: string,
    options: BacktraceDecoderOptions = {},
  ) {
    this.commandRunner = options.commandRunner ?? runCommand;
    this.onDecoded = options.onDecoded ?? ((output) => process.stderr.write(`${output}\n`));
    this.onWarning =
      options.onWarning ?? ((message) => process.stderr.write(`[wokwi-cli] ${message}\n`));
  }

  write(bytes: Uint8Array): void {
    this.pendingLine += this.textDecoder.decode(bytes, { stream: true });
    const lines = this.pendingLine.split('\n');
    this.pendingLine = lines.pop() ?? '';

    for (const line of lines) {
      this.decodeLine(line.replace(/\r$/, ''));
    }

    if (this.pendingLine.length > MAX_PENDING_LINE_LENGTH) {
      this.pendingLine = this.pendingLine.slice(-MAX_PENDING_LINE_LENGTH);
    }
  }

  private decodeLine(line: string): void {
    if (this.disabled) {
      return;
    }

    const addresses = extractBacktraceAddresses(line);
    if (addresses.length === 0) {
      return;
    }

    this.pendingBacktraces.push(addresses);
    this.decodeNextBacktrace();
  }

  private decodeNextBacktrace(): void {
    if (this.disabled || this.commandPending) {
      return;
    }

    const addresses = this.pendingBacktraces.shift();
    if (!addresses) {
      return;
    }

    this.commandPending = true;
    this.commandRunner(
      this.executable,
      ['-pfiaC', '-e', this.elfPath, ...addresses],
      (error, stdout) => {
        this.commandPending = false;
        if (error) {
          this.disabled = true;
          this.pendingBacktraces.length = 0;
          this.onWarning(
            `Could not run ${this.executable} to decode the ESP-IDF backtrace: ${error.message}`,
          );
          return;
        }

        const decoded = stdout.trim();
        if (decoded.length > 0) {
          this.onDecoded(`Decoded ESP-IDF backtrace:\n${decoded}`);
        }

        this.decodeNextBacktrace();
      },
    );
  }
}
