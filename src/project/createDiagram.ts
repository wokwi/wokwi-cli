import { families, type IBoard, type SerialInterface } from './boards.js';

export function createDiagram(board: IBoard, serialInterface?: SerialInterface) {
  const familyInfo = families[board.family];
  const serialPins = board.serialPins ?? { RX: 'RX', TX: 'TX' };
  const attrs: Record<string, string> = {};
  const mcuPartId = familyInfo.mcuPartId;

  const connections: Array<[string, string, string]> = [];
  if (!serialInterface || serialInterface === 'uart') {
    connections.push(
      [`${mcuPartId}:${serialPins.TX}`, '$serialMonitor:RX', ''],
      [`${mcuPartId}:${serialPins.RX}`, '$serialMonitor:TX', ''],
    );
  } else if (serialInterface === 'usb-serialjtag') {
    attrs.serialInterface = 'USB_SERIAL_JTAG';
  }

  return {
    version: 1,
    author: 'Uri Shaked',
    editor: 'wokwi',
    parts: [{ type: board.type, id: mcuPartId, attrs }],
    connections,
  };
}
