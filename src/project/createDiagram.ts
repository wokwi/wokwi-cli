export function createDiagram(board: string) {
  return {
    version: 1,
    author: 'Uri Shaked',
    editor: 'wokwi',
    parts: [{ type: board, id: 'esp' }],
    connections: [
      ['esp:TX', '$serialMonitor:RX', ''],
      ['esp:RX', '$serialMonitor:TX', ''],
    ],
  };
}
