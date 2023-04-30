import { readFileSync } from 'fs';
import { join } from 'path';
import { APIClient } from './APIClient';
import type { APIEvent, SerialMonitorDataPayload } from './APITypes';
import { parseConfig } from './config';

async function main() {
  const token = process.env.WOKWI_CLI_TOKEN;
  if (token == null || token.length === 0) {
    console.error(
      `Error: Missing WOKWI_CLI_TOKEN environment variable. Please set it to your Wokwi token.`
    );
    process.exit(1);
  }

  const rootDir = process.argv[2] || '.';
  const configPath = `${rootDir}/wokwi.toml`;
  const configData = readFileSync(configPath, 'utf8');
  const config = await parseConfig(configData, rootDir);
  const diagramFile = `${rootDir}/diagram.json`;
  const diagram = readFileSync(diagramFile, 'utf8');

  const firmwarePath = join(rootDir, config.wokwi.firmware);
  const elfPath = join(rootDir, config.wokwi.elf);

  const client = new APIClient(token);
  client.onConnected = (hello) => {
    console.log(`Connected to Wokwi Simulation API ${hello.appVersion}`);
  };
  await client.connected;
  await client.fileUpload('diagram.json', diagram);
  await client.fileUpload('firmware', readFileSync(firmwarePath));
  await client.fileUpload('firmware.elf', readFileSync(elfPath));

  console.log('Starting simulation...');

  await client.serialMonitorListen();
  await client.simStart({ elf: 'test.elf', firmware: 'firmware' });

  client.onEvent = (event) => {
    if (event.event === 'serial-monitor:data') {
      for (const byte of (event as APIEvent<SerialMonitorDataPayload>).payload.bytes) {
        process.stdout.write(String.fromCharCode(byte));
      }
    }
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
