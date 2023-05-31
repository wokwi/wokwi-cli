export interface WokwiTOMLChip {
  name: string;
  binary: string;
}

export interface WokwiTOML {
  wokwi: {
    version: number;
    firmware: string;
    elf: string;
  };
  chip?: WokwiTOMLChip[];
}
