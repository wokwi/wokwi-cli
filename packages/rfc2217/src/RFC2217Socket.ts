/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import EventEmitter from 'events';
import { Socket } from 'net';

enum Command {
  SE = 0xf0, // Subnegotiation End
  SB = 0xfa, // Subnegotiation Begin
  WILL = 0xfb,
  WONT = 0xfc,
  DO = 0xfd,
  DONT = 0xfe,
  IAC = 0xff, // Interpret As Command
}

enum OptionCode {
  COM_PORT = 44,
}

enum SerialPortOption {
  SET_BAUDRATE = 0x01,
  SET_DATASIZE = 0x02,
  SET_PARITY = 0x03,
  SET_STOPSIZE = 0x04,
  SET_CONTROL = 0x05,
  PURGE_RECEIVE_BUFFER = 0x0c,
}

enum State {
  Normal,
  IAC,
  SubNegotiation,
  SubNegotiationIAC,
  Negotiate,
}

export enum Parity {
  None = 1,
  Odd = 2,
  Even = 3,
}

export enum ControlCode {
  /** Request Com Port Flow Control Setting (outbound/both) */
  REQ_FLOW_SETTING = 0x00,
  /** Use No Flow Control (outbound/both) */
  USE_NO_FLOW_CONTROL = 0x01,
  /** Use XON/XOFF Flow Control (outbound/both) */
  USE_SW_FLOW_CONTROL = 0x02,
  /** Use HARDWARE Flow Control (outbound/both) */
  USE_HW_FLOW_CONTROL = 0x03,
  /** Request BREAK State */
  REQ_BREAK_STATE = 0x04,
  /** Set BREAK State ON */
  BREAK_ON = 0x05,
  /** Set BREAK State OFF */
  BREAK_OFF = 0x06,
  /** Request DTR Signal State */
  REQ_DTR = 0x07,
  /** Set DTR Signal State ON */
  DTR_ON = 0x08,
  /** Set DTR Signal State OFF */
  DTR_OFF = 0x09,
  /** Request RTS Signal State */
  REQ_RTS = 0x0a,
  /** Set RTS Signal State ON */
  RTS_ON = 0x0b,
  /** Set RTS Signal State OFF */
  RTS_OFF = 0x0c,
  /** Request Com Port Flow Control Setting (inbound) */
  REQ_FLOW_SETTING_IN = 0x0d,
  /** Use No Flow Control (inbound) */
  USE_NO_FLOW_CONTROL_IN = 0x0e,
  /** Use XON/XOFF Flow Control (inbound) */
  USE_SW_FLOW_CONTOL_IN = 0x0f,
  /** Use HARDWARE Flow Control (inbound) */
  USE_HW_FLOW_CONTOL_IN = 0x10,
  /** Use DCD Flow Control (outbound/both) */
  USE_DCD_FLOW_CONTROL = 0x11,
  /** Use DTR Flow Control (inbound) */
  USE_DTR_FLOW_CONTROL = 0x12,
  /** Use DSR Flow Control (outbound/both) */
  USE_DSR_FLOW_CONTROL = 0x13,
}

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
export declare interface RFC2217Socket {
  on(event: 'data', listener: (value: number) => void): this;
  on(event: 'control', listener: (value: ControlCode) => void): this;
  on(event: 'config', listener: (paramName: string, value: number) => void): this;
  on(event: 'purge', listener: () => void): this;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(event: string, listener: Function): this;
}
/* eslint-enable @typescript-eslint/no-unsafe-declaration-merging */

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class RFC2217Socket extends EventEmitter {
  private state = State.Normal;
  private telnetCommand = 0;
  private suboption: number[] = [];

  baudrate: number = 0;
  dataSize: number = 8;
  parity = Parity.None;
  stopSize: number = 1;

  constructor(private socket: Socket) {
    super();
    socket.on('data', (data: Buffer) => this.onData(data));
  }

  private onData(data: Buffer) {
    for (const byte of data) {
      switch (this.state) {
        case State.Normal:
          if (byte === Command.IAC) {
            this.state = State.IAC;
          } else {
            this.emit('data', byte);
          }
          break;

        case State.SubNegotiation:
          if (byte === Command.IAC) {
            this.state = State.SubNegotiationIAC;
          } else {
            this.suboption.push(byte);
          }
          break;

        case State.IAC:
        case State.SubNegotiationIAC:
          switch (byte) {
            case Command.IAC:
              // Double IAC is a literal IAC
              if (this.state === State.IAC) {
                this.emit('data', byte);
                this.state = State.Normal;
              } else {
                this.suboption.push(byte);
                this.state = State.SubNegotiation;
              }
              break;

            case Command.SB:
              this.state = State.SubNegotiation;
              this.suboption = [];
              break;

            case Command.SE:
              this.onSubNegotiation(this.suboption);
              this.state = State.Normal;
              break;

            case Command.WILL:
            case Command.WONT:
            case Command.DO:
            case Command.DONT:
              this.telnetCommand = byte;
              this.state = State.Negotiate;
              break;

            default:
              console.warn('Unhandled telnet command', byte);
              this.state = State.Normal;
              break;
          }
          break;

        case State.Negotiate:
          this.onNegotiate(byte);
          this.state = State.Normal;
          break;
      }
    }
  }

  private onNegotiate(byte: number) {
    if (byte === OptionCode.COM_PORT && this.telnetCommand === Command.WILL) {
      this.socket.write(Buffer.from([Command.IAC, Command.DO, OptionCode.COM_PORT]));
    }
  }

  private onSubNegotiation(data: number[]) {
    if (data[0] !== OptionCode.COM_PORT) {
      console.warn('Unhandled subnegotiation', data);
      return;
    }

    switch (data[1]) {
      case SerialPortOption.SET_BAUDRATE:
        this.baudrate = data[2] * 256 * 256 * 256 + data[3] * 256 * 256 + data[4] * 256 + data[5];
        this.emit('config', 'baudrate', this.baudrate);
        break;

      case SerialPortOption.SET_DATASIZE:
        this.dataSize = data[2];
        this.emit('config', 'dataSize', this.dataSize);
        break;

      case SerialPortOption.SET_PARITY:
        this.parity = data[2];
        this.emit('config', 'parity', this.parity);
        break;

      case SerialPortOption.SET_STOPSIZE:
        this.stopSize = data[2];
        this.emit('config', 'stopSize', this.stopSize);
        break;

      case SerialPortOption.SET_CONTROL:
        this.emit('control', data[2]);
        break;

      case SerialPortOption.PURGE_RECEIVE_BUFFER:
        this.emit('purge');
        break;

      default:
        console.warn('Unhandled subnegotiation', data);
        return;
    }

    this.socket.write(
      Buffer.from([
        Command.IAC,
        Command.SB,
        OptionCode.COM_PORT,
        data[1] + 0x64,
        ...data.slice(2),
        Command.IAC,
        Command.SE,
      ]),
    );
  }

  write(byte: number) {
    if (byte === Command.IAC) {
      this.socket.write(Buffer.from([Command.IAC, Command.IAC]));
    } else {
      this.socket.write(Buffer.from([byte]));
    }
  }

  close() {
    this.socket.end();
  }
}
