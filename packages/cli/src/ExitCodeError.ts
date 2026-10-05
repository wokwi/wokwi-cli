/** An error that ends the CLI with a specific exit code instead of the generic 1 */
export class ExitCodeError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ExitCodeError';
  }
}
