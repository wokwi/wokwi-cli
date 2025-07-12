import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { APIClient } from '../APIClient.js';
import type { APIEvent } from '../APITypes.js';
import { EventManager } from '../EventManager.js';
import { parseConfig } from '../config.js';
import { loadChips } from '../loadChips.js';
import { uploadFirmware } from '../uploadFirmware.js';

export interface SimulationStatus {
  running: boolean;
  connected: boolean;
  nanos: number;
  project?: string;
}

export class SimulationManager {
  private client?: APIClient;
  private readonly eventManager: EventManager;
  private isConnected = false;
  private currentProject?: string;
  private serialBuffer: string[] = [];
  private readonly maxSerialBuffer = 1000;

  constructor(
    private readonly rootDir: string,
    private readonly token: string,
    private readonly quiet = false
  ) {
    this.eventManager = new EventManager();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.client = new APIClient(this.token);
    
    this.client.onConnected = (hello) => {
      this.isConnected = true;
      if (!this.quiet) {
        console.error(`Connected to Wokwi Simulation API ${hello.appVersion}`);
      }
    };

    this.client.onError = (error) => {
      this.isConnected = false;
      throw new Error(`API Error: ${error.message}`);
    };

    this.client.onEvent = (event: APIEvent) => {
      if (event.event === 'serial-monitor:data') {
        const bytes = (event as any).payload.bytes;
        const text = bytes.map((byte: number) => String.fromCharCode(byte)).join('');
        this.addToSerialBuffer(text);
      }
    };

    await this.client.connected;
  }

  private addToSerialBuffer(text: string) {
    this.serialBuffer.push(text);
    if (this.serialBuffer.length > this.maxSerialBuffer) {
      this.serialBuffer.shift();
    }
  }

  async startSimulation(projectPath?: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    const targetDir = projectPath ?? this.rootDir;
    const configPath = path.join(targetDir, 'wokwi.toml');
    const diagramFilePath = path.join(targetDir, 'diagram.json');
    
    if (!existsSync(configPath)) {
      throw new Error(`wokwi.toml not found in ${targetDir}`);
    }

    if (!existsSync(diagramFilePath)) {
      throw new Error(`diagram.json not found in ${targetDir}`);
    }

    const configData = readFileSync(configPath, 'utf8');
    const config = await parseConfig(configData, targetDir);
    const diagram = readFileSync(diagramFilePath, 'utf8');

    const firmwarePath = path.join(targetDir, config.wokwi.firmware);
    if (!existsSync(firmwarePath)) {
      throw new Error(`Firmware file not found: ${firmwarePath}`);
    }

    const elfPath = config.wokwi.elf ? path.join(targetDir, config.wokwi.elf) : null;
    if (elfPath && !existsSync(elfPath)) {
      throw new Error(`ELF file not found: ${elfPath}`);
    }

    const chips = loadChips(config.chip ?? [], targetDir);

    // Upload files
    if (!this.client) {
      throw new Error('Not connected to API');
    }
    await this.client.fileUpload('diagram.json', diagram);
    const firmwareName = await uploadFirmware(this.client, firmwarePath);
    
    if (elfPath) {
      await this.client.fileUpload('firmware.elf', readFileSync(elfPath));
    }

    for (const chip of chips) {
      await this.client.fileUpload(`${chip.name}.chip.json`, readFileSync(chip.jsonPath, 'utf-8'));
      await this.client.fileUpload(`${chip.name}.chip.wasm`, readFileSync(chip.wasmPath));
    }

    // Start simulation
    await this.client.serialMonitorListen();
    await this.client.simStart({
      firmware: firmwareName,
      elf: elfPath ? 'firmware.elf' : undefined,
      chips: chips.map((chip) => chip.name),
    });

    this.currentProject = targetDir;
  }

  async stopSimulation(): Promise<void> {
    if (this.client) {
      await this.client.simPause();
    }
  }

  async resumeSimulation(): Promise<void> {
    if (this.client) {
      await this.client.simResume();
    }
  }

  async restartSimulation(): Promise<void> {
    if (this.client) {
      await this.client.simRestart();
    }
  }

  async getStatus(): Promise<SimulationStatus> {
    if (!this.client) {
      return {
        running: false,
        connected: false,
        nanos: 0,
      };
    }

    const status = await this.client.simStatus();
    return {
      running: status.running,
      connected: this.isConnected,
      nanos: status.nanos,
      project: this.currentProject,
    };
  }

  async writeSerial(text: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to simulation');
    }

    const bytes = Array.from(text).map(char => char.charCodeAt(0));
    await this.client.serialMonitorWrite(bytes);
  }

  getSerialOutput(): string {
    return this.serialBuffer.join('');
  }

  clearSerialBuffer(): void {
    this.serialBuffer = [];
  }

  async readPin(partId: string, pin: string): Promise<{ value: number; voltage: number }> {
    if (!this.client) {
      throw new Error('Not connected to simulation');
    }

    const result = await this.client.pinRead(partId, pin);
    return {
      value: result.value,
      voltage: result.voltage,
    };
  }

  async setControl(partId: string, control: string, value: number): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to simulation');
    }

    await this.client.controlSet(partId, control, value);
  }

  async takeScreenshot(partId: string): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to simulation');
    }

    const result = await this.client.framebufferRead(partId);
    return result.png;
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = undefined;
      this.isConnected = false;
    }
  }
}