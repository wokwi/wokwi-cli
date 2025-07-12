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
import { idfProjectConfig } from './esp/idfProjectConfig.js';
import { cliHelp } from './help.js';
import { loadChips } from './loadChips.js';
import { initProjectWizard } from './project/initProjectWizard.js';
import { readVersion } from './readVersion.js';
import { DelayCommand } from './scenario/DelayCommand.js';
import { ExpectPinCommand } from './scenario/ExpectPinCommand.js';
import { SetControlCommand } from './scenario/SetControlCommand.js';
import { WaitSerialCommand } from './scenario/WaitSerialCommand.js';
import { WriteSerialCommand } from './scenario/WriteSerialCommand.js';
import { uploadFirmware } from './uploadFirmware.js';
import { TakeScreenshotCommand } from './scenario/TakeScreenshotCommand.js';
import { WokwiMCPServer } from './mcp/MCPServer.js';

const millis = 1_000_000;

function printVersion(short = false) {
  const { sha, version } = readVersion();
  if (short) {
    console.log(`${version} (${sha})`);
  } else {
    console.log(`Wokwi CLI v${version} (${sha})`);
  }
}

async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--quiet': Boolean,
      '--version': Boolean,
      '--short-version': Boolean,
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

  if (args['--version'] === true || args['--short-version'] === true) {
    printVersion(args['--short-version']);
    process.exit(0);
  }

  if (!quiet) {
    printVersion();
  }

  if (args['--help']) {
    cliHelp();
    process.exit(0);
  }

  if (args._[0] === 'init') {
    await initProjectWizard(args._[1] ?? '.', { diagramFile });
    process.exit(0);
  }

  const token = process.env.WOKWI_CLI_TOKEN;
  if (token == null || token.length === 0) {
    console.error(
      chalkTemplate`{red Error:} Missing {yellow WOKWI_CLI_TOKEN} environment variable. Please set it to your Wokwi token.\nGet your token at {yellow https://wokwi.com/dashboard/ci}.`,
    );
    process.exit(1);
  }

  if (args._[0] === 'mcp') {
    const rootDir = args._[1] || '.';

    const mcpServer = new WokwiMCPServer({ rootDir, token, quiet });

    process.on('SIGINT', () => {
      void mcpServer.stop().then(() => {
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      void mcpServer.stop().then(() => {
        process.exit(0);
      });
    });

    await mcpServer.start();
    return;
  }

  const rootDir = args._[0] || '.';
  const configPath = path.join(rootDir, 'wokwi.toml');
  const diagramFilePath = path.resolve(rootDir, diagramFile ?? 'diagram.json');
  const espIdfFlasherArgsPath = path.resolve(rootDir, 'build/flasher_args.json');
  const espIdfProjectDescriptionPath = path.resolve(rootDir, 'build/project_description.json');
  const isIDFProject =
    existsSync(espIdfFlasherArgsPath) && existsSync(espIdfProjectDescriptionPath);
  let configExists = existsSync(configPath);
  let diagramExists = existsSync(diagramFilePath);

  if (isIDFProject) {
    if (!quiet) {
      console.log(`Detected IDF project in ${rootDir}`);
    }
    if (
      !idfProjectConfig({
        rootDir,
        configPath,
        diagramFilePath,
        projectDescriptionPath: espIdfProjectDescriptionPath,
        createConfig: !configExists,
        createDiagram: !diagramExists,
        quiet,
      })
    ) {
      process.exit(1);
    }
    configExists = true;
    diagramExists = true;
  }

  if (!elf && !configExists) {
    console.error(
      chalkTemplate`{red Error:} {yellow wokwi.toml} not found in {yellow ${path.resolve(
        rootDir,
      )}}.`,
    );
    console.error(
      chalkTemplate`Run \`{green wokwi-cli init}\` to automatically create a {yellow wokwi.toml} file.`,
    );
    process.exit(1);
  }

  if (!existsSync(diagramFilePath)) {
    console.error(
      chalkTemplate`{red Error:} {yellow diagram.json} not found in {yellow ${diagramFilePath}}.`,
    );
    console.error(
      chalkTemplate`Run \`{green wokwi-cli init}\` to automatically create a {yellow diagram.json} file.`,
    );
    process.exit(1);
  }

  let firmwarePath;
  let elfPath;
  let config;

  if (configExists) {
    const configData = readFileSync(configPath, 'utf8');
    config = await parseConfig(configData, rootDir);

    firmwarePath = elf ?? join(rootDir, config.wokwi.firmware);
    const configElfPath = config.wokwi.elf ? join(rootDir, config.wokwi.elf) : undefined;
    elfPath = elf ?? configElfPath;
  } else if (elf) {
    firmwarePath = elf;
    elfPath = elf;
  } else {
    throw new Error('Internal error: neither elf nor config exists');
  }

  if (!existsSync(firmwarePath)) {
    const fullPath = path.resolve(firmwarePath);
    console.error(
      chalkTemplate`{red Error:} {yellow firmware file} not found: {yellow ${fullPath}}.`,
    );
    console.error(
      chalkTemplate`Please check the {yellow firmware} path in your {yellow wokwi.toml} configuration file.`,
    );
    process.exit(1);
  }

  if (elfPath != null && !existsSync(elfPath)) {
    const fullPath = path.resolve(elfPath);
    console.error(chalkTemplate`{red Error:} ELF file not found: {yellow ${fullPath}}.`);
    console.error(
      chalkTemplate`Please check the {yellow elf} path in your {yellow wokwi.toml} configuration file.`,
    );
    process.exit(1);
  }

  const diagram = readFileSync(diagramFilePath, 'utf8');

  const chips = loadChips(config?.chip ?? [], rootDir);

  const resolvedScenarioFile = scenarioFile ? path.resolve(rootDir, scenarioFile) : null;
  if (resolvedScenarioFile && !existsSync(resolvedScenarioFile)) {
    const fullPath = path.resolve(resolvedScenarioFile);
    console.error(chalkTemplate`{red Error:} scenario file not found: {yellow ${fullPath}}.`);
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
      'write-serial': new WriteSerialCommand(),
      'take-screenshot': new TakeScreenshotCommand(path.dirname(resolvedScenarioFile)),
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
    if (elfPath != null) {
      await client.fileUpload('firmware.elf', readFileSync(elfPath));
    }

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
        try {
          const result = await client.framebufferRead(screenshotPart);
          writeFileSync(screenshotFile, result.png, 'base64');
        } catch (err) {
          console.error('Error taking screenshot:', (err as Error).toString());
          client.close();
          process.exit(1);
        }
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
      firmware: firmwareName,
      elf: elfPath != null ? 'firmware.elf' : undefined,
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
