export type PausePointType = 'time-relative' | 'time-absolute' | 'serial-bytes';

export interface ITimePausePoint {
  type: 'time-relative' | 'time-absolute';
  nanos: number;
}

export interface ISerialBytesPausePoint {
  type: 'serial-bytes';
  bytes: number[];
}

export type PausePointParams = ISerialBytesPausePoint | ITimePausePoint;

export class PausePoint<T = any> {
  private _resolve!: (info: T) => void;
  readonly promise: Promise<T>;

  constructor(
    readonly id: string,
    readonly params: PausePointParams,
  ) {
    this.promise = new Promise<T>((resolve) => {
      this._resolve = resolve;
    });
  }

  resolve(info: T) {
    this._resolve(info);
  }
}
