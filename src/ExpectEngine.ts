import { EventEmitter } from 'events';

export class ExpectEngine extends EventEmitter {
  readonly expectTexts: string[] = [];
  readonly failTexts: string[] = [];

  private currentLine = '';

  onMatch(type: 'match' | 'fail', text: string) {
    this.emit(type, text);
  }

  feed(bytes: number[]) {
    for (const byte of bytes) {
      const char = String.fromCharCode(byte);
      if (char === '\n') {
        this.emit('line', this.currentLine);
        this.testMatches();
        this.currentLine = '';
      } else {
        if (this.currentLine.length < 10_000) {
          this.currentLine += char;
        }
      }
    }
  }

  private testMatches() {
    for (const candidate of this.expectTexts) {
      if (this.currentLine.includes(candidate)) {
        this.onMatch('match', candidate);
      }
    }
    for (const candidate of this.failTexts) {
      if (this.currentLine.includes(candidate)) {
        this.onMatch('fail', candidate);
      }
    }
  }
}
