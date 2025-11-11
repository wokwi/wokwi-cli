// Main API Client
export { APIClient } from './APIClient.js';

// Transport interfaces and implementations
export { ITransport } from './transport/ITransport.js';
export { MessagePortTransport } from './transport/MessagePortTransport.js';

// Pause Point
export { PausePoint } from './PausePoint.js';
export type {
  PausePointType,
  PausePointParams,
  ITimePausePoint,
  ISerialBytesPausePoint,
} from './PausePoint.js';

// API Types
export type {
  APIError,
  APIHello,
  APICommand,
  APIResponse,
  APIEvent,
  APIResultError,
  APISimStartParams,
  SerialMonitorDataPayload,
  ChipsLogPayload,
  PinReadResponse,
} from './APITypes.js';

// Utilities
export { base64ToByteArray, byteArrayToBase64 } from './base64.js';
