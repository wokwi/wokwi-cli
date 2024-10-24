export const boards = [
  // ESP32 DevKits
  { title: 'ESP32 DevKit', board: 'board-esp32-devkit-c-v4', family: 'esp32' },
  { title: 'ESP32-C3 DevKit', board: 'board-esp32-c3-devkitm-1', family: 'esp32' },
  { title: 'ESP32-C6 DevKit', board: 'board-esp32-c6-devkitc-1', family: 'esp32' },
  { title: 'ESP32-H2 DevKit', board: 'board-esp32-h2-devkitm-1', family: 'esp32' },
  { title: 'ESP32-P4-Function-EV-Board', board: 'board-esp32-p4-function-ev', family: 'esp32' },
  { title: 'ESP32-S2 DevKit', board: 'board-esp32-s2-devkitm-1', family: 'esp32' },
  { title: 'ESP32-S3 DevKit', board: 'board-esp32-s3-devkitc-1', family: 'esp32' },

  // ESP32-based boards
  { title: 'ESP32-C3 Rust DevKit', board: 'board-esp32-c3-rust-1', family: 'esp32' },
  {
    title: 'ESP32-S3-BOX',
    board: 'board-esp32-s3-box',
    family: 'esp32',
    serialPins: { RX: 'G44', TX: 'G43' },
  },
  {
    title: 'ESP32-S3-BOX-3',
    board: 'board-esp32-s3-box-3',
    family: 'esp32',
    serialPins: { RX: 'G44', TX: 'G43' },
  },
  { title: 'M5Stack CoreS3', board: 'board-m5stack-core-s3', family: 'esp32' },

  // RP2040-based boards
  { title: 'Raspberry Pi Pico', board: 'wokwi-pi-pico', family: 'rp2' },
  { title: 'Raspberry Pi Pico W', board: 'board-pi-pico-w', family: 'rp2' },

  // STM32 boards
  { title: 'STM32 Nucleo-64 C031C6', board: 'board-st-nucleo-c031c6', family: 'stm32' },
  { title: 'STM32 Nucleo-64 L031K6', board: 'board-st-nucleo-l031k6', family: 'stm32' },
];
