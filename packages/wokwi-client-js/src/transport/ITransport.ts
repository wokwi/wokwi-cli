export interface ITransport {
  /** Callback to handle incoming messages (parsed as objects) */
  onMessage: (message: any) => void;
  /** Optional callback for transport closure events */
  onClose?: (code: number, reason?: string) => void;
  /** Optional callback for transport-level errors */
  onError?: (error: Error) => void;

  /** Send a message through the transport */
  send(message: any): void;
  /** Establish the connection (if needed) */
  connect(): Promise<void>;
  /** Close the transport */
  close(): void;
}
