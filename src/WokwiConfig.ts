export interface WokwiTOMLChip {
  name: string;
  binary: string;
}

export interface WokwiTOML {
  wokwi: {
    version: number;
    firmware: string;
    elf: string;
    gdbServerPort?: number;
  };
  chip?: WokwiTOMLChip[];
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
