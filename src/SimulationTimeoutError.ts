export class SimulationTimeoutError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'SimulationTimeoutError';
  }
}
