export type BoardFamily = 'esp32' | 'rp2' | 'stm32';

export interface IBoard {
  title: string;
  type: string;
  family: BoardFamily;
  idfTarget?: string;
  serialPins?: { RX: string; TX: string };
}

export interface IFamilyInfo {
  defaultFirmwareExt: string;
  mcuPartId: string;
}

export const boards: IBoard[] = [
  // ESP32 DevKits
  { title: 'ESP32 DevKit', type: 'board-esp32-devkit-c-v4', family: 'esp32', idfTarget: 'esp32' },
  {
    title: 'ESP32-C3 DevKit',
    type: 'board-esp32-c3-devkitm-1',
    family: 'esp32',
    idfTarget: 'esp32c3',
  },
  {
    title: 'ESP32-C6 DevKit',
    type: 'board-esp32-c6-devkitc-1',
    family: 'esp32',
    idfTarget: 'esp32c6',
  },
  {
    title: 'ESP32-H2 DevKit',
    type: 'board-esp32-h2-devkitm-1',
    family: 'esp32',
    idfTarget: 'esp32h2',
  },
  {
    title: 'ESP32-P4-Function-EV-Board',
    type: 'board-esp32-p4-function-ev',
    family: 'esp32',
    idfTarget: 'esp32p4',
    serialPins: { RX: '38', TX: '37' },
  },
  {
    title: 'ESP32-S2 DevKit',
    type: 'board-esp32-s2-devkitm-1',
    family: 'esp32',
    idfTarget: 'esp32s2',
  },
  {
    title: 'ESP32-S3 DevKit',
    type: 'board-esp32-s3-devkitc-1',
    family: 'esp32',
    idfTarget: 'esp32s3',
  },

  // ESP32-based boards
  { title: 'ESP32-C3 Rust DevKit', type: 'board-esp32-c3-rust-1', family: 'esp32' },
  {
    title: 'ESP32-S3-BOX',
    type: 'board-esp32-s3-box',
    family: 'esp32',
    serialPins: { RX: 'G44', TX: 'G43' },
  },
  {
    title: 'ESP32-S3-BOX-3',
    type: 'board-esp32-s3-box-3',
    family: 'esp32',
    serialPins: { RX: 'G44', TX: 'G43' },
  },
  { title: 'M5Stack CoreS3', type: 'board-m5stack-core-s3', family: 'esp32' },

  // RP2040-based boards
  {
    title: 'Raspberry Pi Pico',
    type: 'wokwi-pi-pico',
    family: 'rp2',
    serialPins: { RX: 'GP1', TX: 'GP0' },
  },
  {
    title: 'Raspberry Pi Pico W',
    type: 'board-pi-pico-w',
    family: 'rp2',
    serialPins: { RX: 'GP1', TX: 'GP0' },
  },

  // STM32 boards
  { title: 'STM32 Nucleo-64 C031C6', type: 'board-st-nucleo-c031c6', family: 'stm32' },
  { title: 'STM32 Nucleo-64 L031K6', type: 'board-st-nucleo-l031k6', family: 'stm32' },
];

export const families: Record<BoardFamily, IFamilyInfo> = {
  esp32: {
    defaultFirmwareExt: 'bin',
    mcuPartId: 'esp',
  },
  rp2: {
    defaultFirmwareExt: 'uf2',
    mcuPartId: 'rp',
  },
  stm32: {
    defaultFirmwareExt: 'hex',
    mcuPartId: 'stm',
  },
};
