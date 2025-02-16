import { boards } from './boards.js';

export function createDiagram(board: string) {
  const boardInfo = boards.find((b) => b.board === board);
  const serialPins = boardInfo?.serialPins ?? { RX: 'RX', TX: 'TX' };
  const mcuPartId = boardInfo?.family === 'esp32' ? 'esp' : 'mcu';

  return {
    version: 1,
    author: 'Uri Shaked',
    editor: 'wokwi',
    parts: [{ type: board, id: mcuPartId }],
    connections: [
      [`${mcuPartId}:${serialPins.TX}`, '$serialMonitor:RX', ''],
      [`${mcuPartId}:${serialPins.RX}`, '$serialMonitor:TX', ''],
    ],
  };
}
