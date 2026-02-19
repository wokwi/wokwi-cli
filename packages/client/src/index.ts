// Main API Client
export { APIClient } from './APIClient.js';

// Transport interfaces and implementations
export { type ITransport } from './transport/ITransport.js';
export { MessagePortTransport } from './transport/MessagePortTransport.js';

// Pause Point
export { PausePoint } from './PausePoint.js';
export type {
  ISerialBytesPausePoint,
  ITimePausePoint,
  PausePointParams,
  PausePointType,
} from './PausePoint.js';

// API Types
export type {
  APICommand,
  APIError,
  APIEvent,
  APIHello,
  APIResponse,
  APIResultError,
  APISimStartParams,
  ChipsLogPayload,
  FlashSection,
  PinReadResponse,
  SerialMonitorDataPayload,
  VCDReadResponse,
} from './APITypes.js';

// Utilities
export { base64ToByteArray, byteArrayToBase64 } from './base64.js';
