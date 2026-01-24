import { APIClient, MessagePortTransport } from '@wokwi/client';

const diagram = `{
  "version": 1,
  "author": "Uri Shaked",
  "editor": "wokwi",
  "parts": [
    {
      "type": "board-esp32-devkit-c-v4",
      "id": "esp",
      "top": 0,
      "left": 0,
      "attrs": { "env": "micropython-20231227-v1.22.0" }
    }
  ],
  "connections": [ [ "esp:TX", "$serialMonitor:RX", "", [] ], [ "esp:RX", "$serialMonitor:TX", "", [] ] ],
  "dependencies": {}
}`;

const microPythonCode = `
import time
while True:
    print(f"Hello, World {time.time()}")
    time.sleep(1)
`;

const outputText = document.getElementById('output-text');

window.addEventListener('message', async (event) => {
  if (!event.data.port) {
    return;
  }

  const client = new APIClient(new MessagePortTransport(event.data.port));

  // Wait for connection
  await client.connected;
  console.log('Wokwi client connected');

  // Set up event listeners
  client.listen('serial-monitor:data', (event) => {
    const rawBytes = new Uint8Array(event.payload.bytes);
    outputText.textContent += new TextDecoder().decode(rawBytes);
  });

  // Initialize simulation
  try {
    await client.serialMonitorListen();
    await client.fileUpload('main.py', microPythonCode);
    await client.fileUpload('diagram.json', diagram);
  } catch (error) {
    console.error('Error initializing simulation:', error);
  }

  document.querySelector('.start-button').addEventListener('click', async () => {
    try {
      await client.simStart({
        firmware: 'main.py',
        elf: 'main.py',
      });
    } catch (error) {
      console.error('Error starting simulation:', error);
    }
  });
});
console.log('Wokwi ESP32 MicroPython script loaded');
