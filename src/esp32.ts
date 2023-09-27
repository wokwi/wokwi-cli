export interface IESP32FlasherJSON {
  write_flash_args: string[];
  flash_settings: FlashSettings;
  flash_files: Record<string, string>;
  bootloader: IFlashFile;
  app: IFlashFile;
  'partition-table': IFlashFile;
  extra_esptool_args: ExtraEsptoolArgs;
}

export interface IFlashFile {
  offset: string;
  file: string;
  encrypted: string;
}

export interface ExtraEsptoolArgs {
  after: string;
  before: string;
  stub: boolean;
  chip: string;
}

export interface FlashSettings {
  flash_mode: string;
  flash_size: string;
  flash_freq: string;
}
