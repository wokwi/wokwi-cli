import arg from 'arg';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import path, { join } from 'path';
import { APIClient } from './APIClient';
import type { APIEvent, SerialMonitorDataPayload } from './APITypes';
import { parseConfig } from './config';
import { cliHelp } from './help';
import { readVersion } from './readVersion';
import { ExpectEngine } from './ExpectEngine';

async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--quiet': Boolean,
      '--version': Boolean,
      '--expect-text': String,
      '--fail-text': String,
      '--timeout': Number,
      '-h': '--help',
      '-q': '--quiet',
    },
    { argv: process.argv.slice(2) }
  );

  const quiet = args['--quiet'];
  const expectText = args['--expect-text'];
  const failText = args['--fail-text'];
  const timeout = args['--timeout'] ?? 0;
  const timeoutNanos = timeout * 1_000_000;

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

  const expectEngine = new ExpectEngine();

  if (expectText) {
    expectEngine.expectTexts.push(expectText);
    expectEngine.on('match', (text) => {
      if (!quiet) {
        console.log(chalk`\n\nExpected text found: {green "${expectText}"}`);
        console.log('TEST PASSED.');
      }
      process.exit(0);
    });
  }

  if (failText) {
    expectEngine.failTexts.push(failText);
    expectEngine.on('fail', (text) => {
      console.error(chalk`\n\n{red Error:} Unexpected text found: {yellow "${text}"}`);
      console.error('TEST FAILED.');
      process.exit(1);
    });
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
  await client.simStart({ elf: 'test.elf', firmware: 'firmware', pause: timeoutNanos > 0 });
  if (timeout > 0) {
    await client.simResume(timeoutNanos);
  }

  client.onEvent = (event) => {
    if (event.event === 'sim:pause') {
      if (timeoutNanos && event.nanos >= timeoutNanos) {
        console.error(`Timeout: simulation did not finish in ${timeout}ms`);
        process.exit(42);
      }
    }
    if (event.event === 'serial-monitor:data') {
      const { bytes } = (event as APIEvent<SerialMonitorDataPayload>).payload;
      for (const byte of bytes) {
        process.stdout.write(String.fromCharCode(byte));
      }
      expectEngine.feed(bytes);
    }
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
