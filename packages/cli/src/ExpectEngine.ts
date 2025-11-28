import { EventEmitter } from 'events';

export class ExpectEngine extends EventEmitter {
  readonly expectTexts: string[] = [];
  private currentLine = '';

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

  /**
   * Waits for a specific text to appear in the input stream.
   *
   * @param text The text to wait for.
   * @returns A promise that resolves when the text is matched.
   */
  async waitForMatch(text: string): Promise<void> {
    this.expectTexts.push(text);
    return new Promise<void>((resolve) => {
      this.on('match', (matchedText) => {
        if (matchedText === text) {
          this.expectTexts.splice(this.expectTexts.indexOf(text), 1);
          resolve();
        }
      });
    });
  }

  private testMatches() {
    for (const candidate of this.expectTexts) {
      if (this.currentLine.includes(candidate)) {
        this.emit('match', candidate);
      }
    }
  }
}
