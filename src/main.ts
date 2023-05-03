import arg from 'arg';
import { existsSync, readFileSync } from 'fs';
import path, { join } from 'path';
import { APIClient } from './APIClient';
import type { APIEvent, SerialMonitorDataPayload } from './APITypes';
import { parseConfig } from './config';
import { readVersion } from './readVersion';
import { cliHelp } from './help';

async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--quiet': Boolean,
      '--version': Boolean,
      '-h': '--help',
      '-q': '--quiet',
    },
    { argv: process.argv.slice(2) }
  );

  const quiet = args['--quiet'];
  if (!quiet) {
    const { sha, version } = readVersion();
    console.log(`Wokwi CLI v${version} (${sha})`);
  }

  if (args['--help']) {
    cliHelp();
    process.exit(0);
  }

  const token = process.env.WOKWI_CLI_TOKEN;
  if (token == null || token.length === 0) {
    console.error(
      `Error: Missing WOKWI_CLI_TOKEN environment variable. Please set it to your Wokwi token.`
    );
    process.exit(1);
  }

  const rootDir = args._[0] || '.';
  const configPath = `${rootDir}/wokwi.toml`;
  const diagramFile = `${rootDir}/diagram.json`;

  if (!existsSync(configPath)) {
    console.error(`Error: wokwi.toml not found in ${path.resolve(rootDir)}`);
    process.exit(1);
  }

  if (!existsSync(diagramFile)) {
    console.error(`Error: diagram.json not found in ${path.resolve(rootDir)}`);
    process.exit(1);
  }

  const configData = readFileSync(configPath, 'utf8');
  const config = await parseConfig(configData, rootDir);
  const diagram = readFileSync(diagramFile, 'utf8');

  const firmwarePath = join(rootDir, config.wokwi.firmware);
  const elfPath = join(rootDir, config.wokwi.elf);

  if (!existsSync(firmwarePath)) {
    console.error(`Error: firmware file not found: ${path.resolve(firmwarePath)}`);
    process.exit(1);
  }

  if (!existsSync(elfPath)) {
    console.error(`Error: ELF file not found: ${path.resolve(elfPath)}`);
    process.exit(1);
  }

  const client = new APIClient(token);
  client.onConnected = (hello) => {
    if (!quiet) {
      console.log(`Connected to Wokwi Simulation API ${hello.appVersion}`);
    }
  };
  await client.connected;
  await client.fileUpload('diagram.json', diagram);
  await client.fileUpload('firmware', readFileSync(firmwarePath));
  await client.fileUpload('firmware.elf', readFileSync(elfPath));

  if (!quiet) {
    console.log('Starting simulation...');
  }

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
