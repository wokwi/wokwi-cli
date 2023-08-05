import arg from 'arg';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';
import YAML from 'yaml';
import { APIClient } from './APIClient';
import type { APIEvent, ChipsLogPayload, SerialMonitorDataPayload } from './APITypes';
import { EventManager } from './EventManager';
import { ExpectEngine } from './ExpectEngine';
import { TestScenario } from './TestScenario';
import { parseConfig } from './config';
import { cliHelp } from './help';
import { loadChips } from './loadChips';
import { readVersion } from './readVersion';
import { DelayCommand } from './scenario/DelayCommand';
import { SetControlCommand } from './scenario/SetControlCommand';
import { WaitSerialCommand } from './scenario/WaitSerialCommand';
import { ExpectPinCommand } from './scenario/ExpectPinCommand';

const millis = 1_000_000;

async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--quiet': Boolean,
      '--version': Boolean,
      '--expect-text': String,
      '--fail-text': String,
      '--scenario': String,
      '--screenshot-part': String,
      '--screenshot-file': String,
      '--screenshot-time': Number,
      '--timeout': Number,
      '--timeout-exit-code': Number,
      '-h': '--help',
      '-q': '--quiet',
    },
    { argv: process.argv.slice(2) }
  );

  const quiet = args['--quiet'];
  const expectText = args['--expect-text'];
  const failText = args['--fail-text'];
  const scenarioFile = args['--scenario'];
  const timeout = args['--timeout'] ?? 0;
  const screenshotPart = args['--screenshot-part'];
  const screenshotTime = args['--screenshot-time'];
  const screenshotFile = args['--screenshot-file'] ?? 'screenshot.png';
  const timeoutExitCode = args['--timeout-exit-code'] ?? 42;
  const timeoutNanos = timeout * millis;

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

  const chips = loadChips(config.chip ?? [], rootDir);

  const resolvedScenarioFile = scenarioFile ? path.resolve(rootDir, scenarioFile) : null;
  if (resolvedScenarioFile && !existsSync(resolvedScenarioFile)) {
    console.error(`Error: scenario file not found: ${path.resolve(resolvedScenarioFile)}`);
    process.exit(1);
  }

  const eventManager = new EventManager();
  const expectEngine = new ExpectEngine();

  let scenario;
  if (resolvedScenarioFile) {
    scenario = new TestScenario(
      YAML.parse(readFileSync(resolvedScenarioFile, 'utf-8')),
      eventManager
    );
    scenario.registerCommands({
      delay: new DelayCommand(eventManager),
      'expect-pin': new ExpectPinCommand(),
      'set-control': new SetControlCommand(),
      'wait-serial': new WaitSerialCommand(expectEngine),
    });
    scenario.validate();
  }

  if (expectText) {
    expectEngine.expectTexts.push(expectText);
    expectEngine.on('match', (text) => {
      if (text !== expectText) {
        return;
      }

      if (!quiet) {
        console.log(chalk`\n\nExpected text found: {green "${expectText}"}`);
        console.log('TEST PASSED.');
      }
      client.close();
      process.exit(0);
    });
  }

  if (failText) {
    expectEngine.failTexts.push(failText);
    expectEngine.on('fail', (text) => {
      if (text !== failText) {
        return;
      }

      console.error(chalk`\n\n{red Error:} Unexpected text found: {yellow "${text}"}`);
      console.error('TEST FAILED.');
      client.close();
      process.exit(1);
    });
  }

  const client = new APIClient(token);
  client.onConnected = (hello) => {
    if (!quiet) {
      console.log(`Connected to Wokwi Simulation API ${hello.appVersion}`);
    }
  };
  client.onError = (error) => {
    console.error('API Error:', error.message);
    process.exit(1);
  };

  try {
    await client.connected;
    await client.fileUpload('diagram.json', diagram);
    const extension = firmwarePath.split('.').pop();
    const firmwareName = `firmware.${extension}`;
    await client.fileUpload(firmwareName, readFileSync(firmwarePath));
    await client.fileUpload('firmware.elf', readFileSync(elfPath));

    for (const chip of chips) {
      await client.fileUpload(`${chip.name}.chip.json`, readFileSync(chip.jsonPath, 'utf-8'));
      await client.fileUpload(`${chip.name}.chip.wasm`, readFileSync(chip.wasmPath));
    }

    if (!quiet) {
      console.log('Starting simulation...');
    }

    const scenarioPromise = scenario?.start(client);

    if (timeoutNanos) {
      eventManager.at(timeoutNanos, () => {
        // We are using setImmediate to make sure other events (e.g. screen shot) are processed first
        setImmediate(() => {
          void eventManager.eventHandlersInProgress.then(() => {
            console.error(`Timeout: simulation did not finish in ${timeout}ms`);
            client.close();
            process.exit(timeoutExitCode);
          });
        });
      });
    }

    if (screenshotPart != null && screenshotTime != null) {
      eventManager.at(screenshotTime * millis, async (t) => {
        const result = await client.framebufferRead(screenshotPart);
        writeFileSync(screenshotFile, result.png, 'base64');
      });
    }

    await client.serialMonitorListen();
    const { timeToNextEvent } = eventManager;

    client.onEvent = (event) => {
      if (event.event === 'sim:pause') {
        eventManager.processEvents(event.nanos);
        if (eventManager.timeToNextEvent >= 0) {
          void client.simResume(eventManager.timeToNextEvent);
        }
      }
      if (event.event === 'serial-monitor:data') {
        const { bytes } = (event as APIEvent<SerialMonitorDataPayload>).payload;
        for (const byte of bytes) {
          process.stdout.write(String.fromCharCode(byte));
        }
        expectEngine.feed(bytes);
      }
      if (event.event === 'chips:log') {
        const { message, chip } = (event as APIEvent<ChipsLogPayload>).payload;
        console.log(chalk`[{magenta ${chip}}] ${message}`);
      }
    };

    await client.simStart({
      elf: 'test.elf',
      firmware: firmwareName,
      chips: chips.map((chip) => chip.name),
      pause: timeToNextEvent >= 0,
    });

    if (timeToNextEvent > 0) {
      await client.simResume(timeToNextEvent);
    }

    await scenarioPromise;
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
