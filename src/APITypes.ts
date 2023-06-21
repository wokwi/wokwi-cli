export interface APIError {
  type: 'error';
  message: string;
}

export interface APIHello {
  type: 'hello';
  protocolVersion: number;
  appName: string;
  appVersion: string;
}

export interface APICommand<T = any> {
  type: 'command';
  command: string;
  id?: string;
  params?: T;
}

export interface APIResponse<T = any> {
  type: 'response';
  command: string;
  id?: string;
  result: T;
  error: boolean;
}

export interface APIEvent<T = any> {
  type: 'event';
  event: string;
  payload: T;
  nanos: number;
  paused: boolean;
}

export interface SerialMonitorDataPayload {
  bytes: number[];
}

export interface ChipsLogPayload {
  chip: string;
  message: string;
}

export interface APIResultError {
  code: number;
  message: string;
}

export interface APISimStartParams {
  firmware: string;
  elf: string;
  pause?: boolean;
  chips?: string[];
}

export interface PinReadResponse {
  pin: string;
  value: number;
}
