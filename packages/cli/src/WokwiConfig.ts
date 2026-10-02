export interface WokwiTOMLChip {
  name: string;
  binary: string;
}

/**
 * `[[sdcard]]` section: contents of a micro SD card in the diagram.
 * Exactly one of `folder` / `image` is required.
 */
export interface WokwiTOMLSDCard {
  /** Diagram part id; required only when the diagram has more than one card */
  part?: string;
  /** Directory tree copied onto a freshly formatted card (relative to wokwi.toml) */
  folder?: string;
  /** Raw disk image served as the card, byte for byte (relative to wokwi.toml) */
  image?: string;
  /** Card capacity, e.g. '8M', '512K', '1G' or a number of bytes (default 8M) */
  size?: string | number;
  /** Write the card contents back to the source when the simulation ends (default false) */
  writeback?: boolean;
}

export interface WokwiTOML {
  wokwi: {
    version: number;
    firmware: string;
    elf?: string;
    gdbServerPort?: number;
    rfc2217ServerPort?: number;
  };
  chip?: WokwiTOMLChip[];
  sdcard?: WokwiTOMLSDCard[];
}

export interface WokwiTOMLConfig {
  firmwarePath: string;
  elfPath: string;
  gdbServerPort?: number;
}

export function createWokwiToml(config: WokwiTOMLConfig) {
  const { firmwarePath, elfPath, gdbServerPort } = config;
  const tomlContent = [
    `# Wokwi Configuration File`,
    `# Reference: https://docs.wokwi.com/vscode/project-config`,
    `[wokwi]`,
    `version = 1`,
    `firmware = '${firmwarePath}'`,
    `elf = '${elfPath}'`,
  ];
  if (gdbServerPort) {
    tomlContent.push(`gdbServerPort = ${gdbServerPort}`);
  }
  return tomlContent.join('\n') + '\n';
}
