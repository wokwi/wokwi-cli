import arg from 'arg';
import chalkTemplate from 'chalk-template';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';
import YAML from 'yaml';
import { APIClient } from './APIClient.js';
import type { APIEvent, ChipsLogPayload, SerialMonitorDataPayload } from './APITypes.js';
import { EventManager } from './EventManager.js';
import { ExpectEngine } from './ExpectEngine.js';
import { TestScenario } from './TestScenario.js';
import { parseConfig } from './config.js';
import { cliHelp } from './help.js';
import { loadChips } from './loadChips.js';
import { readVersion } from './readVersion.js';
import { DelayCommand } from './scenario/DelayCommand.js';
import { ExpectPinCommand } from './scenario/ExpectPinCommand.js';
import { SetControlCommand } from './scenario/SetControlCommand.js';
import { WaitSerialCommand } from './scenario/WaitSerialCommand.js';
import { WaitPinCommand } from './scenario/WaitPinCommand.js';
import { WaitPinChangeCommand } from './scenario/WaitPinChangeCommand.js';
import { uploadFirmware } from './uploadFirmware.js';

const millis = 1_000_000;

async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--quiet': Boolean,
      '--version': Boolean,
      '--diagram-file': String,
      '--elf': String,
      '--expect-text': String,
      '--fail-text': String,
      '--interactive': Boolean,
      '--serial-log-file': String,
      '--scenario': String,
      '--screenshot-part': String,
      '--screenshot-file': String,
      '--screenshot-time': Number,
      '--timeout': Number,
      '--timeout-exit-code': Number,
      '-h': '--help',
      '-q': '--quiet',
    },
    { argv: process.argv.slice(2) },
  );

  const quiet = args['--quiet'];
  const elf = args['--elf'];
  const expectText = args['--expect-text'];
  const failText = args['--fail-text'];
  const interactive = args['--interactive'];
  const diagramFile = args['--diagram-file'];
  const serialLogFile = args['--serial-log-file'];
  const scenarioFile = args['--scenario'];
  const timeout = args['--timeout'] ?? 30000;
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
      `Error: Missing WOKWI_CLI_TOKEN environment variable. Please set it to your Wokwi token.\nGet your token at https://wokwi.com/dashboard/ci.`,
    );
    process.exit(1);
  }

  const rootDir = args._[0] || '.';
  const configPath = path.join(rootDir, 'wokwi.toml');
  const diagramFilePath = path.resolve(rootDir, diagramFile ?? 'diagram.json');
  const configExists = existsSync(configPath);

  if (!elf && !configExists) {
    console.error(`Error: wokwi.toml not found in ${path.resolve(rootDir)}`);
    process.exit(1);
  }

  if (!existsSync(diagramFilePath)) {
    console.error(`Error: diagram file not found in ${diagramFilePath}`);
    process.exit(1);
  }

  let firmwarePath;
  let elfPath;
  let config;

  if (configExists) {
    const configData = readFileSync(configPath, 'utf8');
    config = await parseConfig(configData, rootDir);

    firmwarePath = elf ?? join(rootDir, config.wokwi.firmware);
    elfPath = elf ?? join(rootDir, config.wokwi.elf);
  } else if (elf) {
    firmwarePath = elf;
    elfPath = elf;
  } else {
    throw new Error('Internal error: neither elf nor config exists');
  }

  if (!existsSync(firmwarePath)) {
    console.error(`Error: firmware file not found: ${path.resolve(firmwarePath)}`);
    process.exit(1);
  }

  if (!existsSync(elfPath)) {
    console.error(`Error: ELF file not found: ${path.resolve(elfPath)}`);
    process.exit(1);
  }

  const diagram = readFileSync(diagramFilePath, 'utf8');

  const chips = loadChips(config?.chip ?? [], rootDir);

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
      eventManager,
    );
    scenario.registerCommands({
      delay: new DelayCommand(eventManager),
      'expect-pin': new ExpectPinCommand(),
      'set-control': new SetControlCommand(),
      'wait-serial': new WaitSerialCommand(expectEngine),
      'wait-pin': new WaitPinCommand(),
      'wait-pin-change': new WaitPinChangeCommand(),
    });
    scenario.validate();
  }

  const serialLogStream = serialLogFile ? createWriteStream(serialLogFile) : null;

  if (expectText) {
    expectEngine.expectTexts.push(expectText);
    expectEngine.on('match', (text) => {
      if (text !== expectText) {
        return;
      }

      if (!quiet) {
        console.log(chalkTemplate`\n\nExpected text found: {green "${expectText}"}`);
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

      console.error(chalkTemplate`\n\n{red Error:} Unexpected text found: {yellow "${text}"}`);
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
    const firmwareName = await uploadFirmware(client, firmwarePath);
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

        serialLogStream?.write(Buffer.from(bytes));
        expectEngine.feed(bytes);
      }
      if (event.event === 'chips:log') {
        const { message, chip } = (event as APIEvent<ChipsLogPayload>).payload;
        console.log(chalkTemplate`[{magenta ${chip}}] ${message}`);
      }
    };

    await client.simStart({
      elf: 'test.elf',
      firmware: firmwareName,
      chips: chips.map((chip) => chip.name),
      pause: timeToNextEvent >= 0,
    });

    if (interactive) {
      process.stdin.pipe(client.serialMonitorWritable());
    }

    if (timeToNextEvent > 0) {
      await client.simResume(timeToNextEvent);
    }

    if (scenarioPromise) {
      await scenarioPromise;
    } else {
      // wait forever - until there's an error, timeout, serial output match, or the user presses Ctrl+C
      await new Promise(() => {});
    }
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
