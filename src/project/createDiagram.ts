import { families, type IBoard } from './boards.js';

export function createDiagram(board: IBoard) {
  const familyInfo = families[board.family];
  const serialPins = board.serialPins ?? { RX: 'RX', TX: 'TX' };
  const mcuPartId = familyInfo.mcuPartId;

  return {
    version: 1,
    author: 'Uri Shaked',
    editor: 'wokwi',
    parts: [{ type: board.type, id: mcuPartId }],
    connections: [
      [`${mcuPartId}:${serialPins.TX}`, '$serialMonitor:RX', ''],
      [`${mcuPartId}:${serialPins.RX}`, '$serialMonitor:TX', ''],
    ],
  };
}
