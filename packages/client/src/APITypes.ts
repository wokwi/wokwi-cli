export interface APIError {
  type: 'error';
  message: string;
}

export interface APIHello {
  type: 'hello';
  protocolVersion: number;
  /** Optional capabilities beyond the base protocol, e.g. `gdb`. Absent on older servers. */
  features?: string[];
  appName: string;
  appVersion: string;
}

export interface APISimStartResponse {
  /** Absent on older servers */
  warnings?: string[];
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

export interface GDBDataPayload {
  part: string;
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

export interface FlashSection {
  offset: number;
  file: string;
}

export interface APISDCardParams {
  /** Diagram part id of the micro SD card; optional when the diagram has a single card */
  part?: string;
  /** Uploaded files whose names start with this prefix are copied to the card (prefix stripped) */
  prefix?: string;
  /** Name of an uploaded raw disk image to serve as the card */
  image?: string;
  /** Card capacity in bytes (default 8 MB) */
  sizeBytes?: number;
}

export interface APISimStartParams {
  firmware?: string | FlashSection[];
  flashSize?: string;
  elf?: string;
  pause?: boolean;
  chips?: string[];
  /** Contents / size of the micro SD card(s) in the diagram */
  sdcards?: APISDCardParams[];
}

export interface APISDCardExportParams {
  part?: string;
  /** `image` (default): the raw disk image; `files`: the files on the card */
  format?: 'image' | 'files';
}

export interface APISDCardExportResponse {
  /** base64-encoded raw disk image (format=image) */
  image?: string;
  /** files on the card, base64-encoded (format=files) */
  files?: Array<{ name: string; binary: string }>;
}

export interface PinReadResponse {
  pin: string;
  value: number;
  voltage: number;
}

export interface VCDReadResponse {
  vcd: string;
  channelCount: number;
  sampleCount: number;
}
