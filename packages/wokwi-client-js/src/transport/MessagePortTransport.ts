import { ITransport } from "./ITransport.js";

/**
 * Transport for communicating with a Wokwi Simulator over a MessagePort.
 * This can be used in the browser to communicate with the Wokwi Simulator in iframe mode.
 */
export class MessagePortTransport implements ITransport {
  public onMessage: (message: any) => void = () => {};
  public onClose?: (code: number, reason?: string) => void;
  public onError?: (error: Error) => void;

  private readonly port: MessagePort;

  constructor(port: MessagePort) {
    this.port = port;
    this.port.onmessage = (event) => {
      this.onMessage(event.data);
    };
    this.port.start();
  }

  async connect(): Promise<void> {
    // MessagePort is ready to use immediately; no handshake needed
  }

  send(message: any): void {
    this.port.postMessage(message);
  }

  close(): void {
    try {
      this.port.close();
    } catch {
      // Ignore errors when closing port
    }
  }
}
