import { boards } from './boards.js';

export function createDiagram(board: string) {
  const boardInfo = boards.find((b) => b.board === board);
  const serialPins = boardInfo?.serialPins ?? { RX: 'RX', TX: 'TX' };

  return {
    version: 1,
    author: 'Uri Shaked',
    editor: 'wokwi',
    parts: [{ type: board, id: 'esp' }],
    connections: [
      [`esp:${serialPins.TX}`, '$serialMonitor:RX', ''],
      [`esp:${serialPins.RX}`, '$serialMonitor:TX', ''],
    ],
  };
}
