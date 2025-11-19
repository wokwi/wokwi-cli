import arg from 'arg';
import chalkTemplate from 'chalk-template';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';
import YAML from 'yaml';
import {
  APIClient,
  type APIEvent,
  type ChipsLogPayload,
  type SerialMonitorDataPayload,
} from 'wokwi-client-js';
import { WebSocketTransport } from './transport/WebSocketTransport.js';
import { DEFAULT_SERVER } from './constants.js';
import { createSerialMonitorWritable } from './utils/serialMonitorWritable.js';
import { ExpectEngine } from './ExpectEngine.js';
import { SimulationTimeoutError } from './SimulationTimeoutError.js';
import { TestScenario } from './TestScenario.js';
import { parseConfig } from './config.js';
import { idfProjectConfig } from './esp/idfProjectConfig.js';
import { cliHelp } from './help.js';
import { loadChips } from './loadChips.js';
import { WokwiMCPServer } from './mcp/MCPServer.js';
import { initProjectWizard } from './project/initProjectWizard.js';
import { readVersion } from './readVersion.js';
import { DelayCommand } from './scenario/DelayCommand.js';
import { ExpectPinCommand } from './scenario/ExpectPinCommand.js';
import { SetControlCommand } from './scenario/SetControlCommand.js';
import { TakeScreenshotCommand } from './scenario/TakeScreenshotCommand.js';
import { WaitSerialCommand } from './scenario/WaitSerialCommand.js';
import { WriteSerialCommand } from './scenario/WriteSerialCommand.js';
import { uploadFirmware } from './uploadFirmware.js';
const { sha, version } = readVersion();

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

  const expectEngine = new ExpectEngine();

  let scenario: TestScenario | undefined;
  if (resolvedScenarioFile) {
    scenario = new TestScenario(YAML.parse(readFileSync(resolvedScenarioFile, 'utf-8')));
    scenario.registerCommands({
      delay: new DelayCommand(),
      'expect-pin': new ExpectPinCommand(),
      'set-control': new SetControlCommand(),
      'wait-serial': new WaitSerialCommand(),
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

  const transport = new WebSocketTransport(token, DEFAULT_SERVER, version, sha);
  const client = new APIClient(transport);
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
      await client.fileUpload('firmware.elf', new Uint8Array(readFileSync(elfPath)));
    }

    for (const chip of chips) {
      await client.fileUpload(`${chip.name}.chip.json`, readFileSync(chip.jsonPath, 'utf-8'));
      await client.fileUpload(
        `${chip.name}.chip.wasm`,
        new Uint8Array(readFileSync(chip.wasmPath)),
      );
    }

    const promises = [];
    let screenshotPromise = Promise.resolve();

    if (screenshotPart != null && screenshotTime != null) {
      if (timeout && screenshotTime > timeout) {
        console.error(
          chalkTemplate`{red Error:} Screenshot time (${screenshotTime}ms) can't be greater than the timeout (${timeout}ms).`,
        );
        process.exit(1);
      }
      screenshotPromise = client.atNanos(screenshotTime * millis).then(async () => {
        try {
          const result = await client.framebufferRead(screenshotPart);
          writeFileSync(screenshotFile, result.png, 'base64');
          await client.simResume();
        } catch (err) {
          console.error('Error taking screenshot:', (err as Error).toString());
          throw err;
        }
      });
    }

    if (!quiet) {
      console.log('Starting simulation...');
    }

    await client.serialMonitorListen();

    client.listen('serial-monitor:data', (event: APIEvent<SerialMonitorDataPayload>) => {
      let { bytes } = event.payload;
      bytes = scenario?.processSerialBytes(bytes) ?? bytes;
      process.stdout.write(new Uint8Array(bytes));

      serialLogStream?.write(Buffer.from(bytes));
      expectEngine.feed(bytes);
    });

    client.listen('chips:log', (event: APIEvent<ChipsLogPayload>) => {
      const { message, chip } = event.payload;
      console.log(chalkTemplate`[{magenta ${chip}}] ${message}`);
    });

    if (timeoutNanos) {
      promises.push(
        client.atNanos(timeoutNanos).then(async () => {
          await screenshotPromise; // wait for the screenshot to be saved, if any
          console.error(chalkTemplate`\n{red Timeout}: simulation did not finish in ${timeout}ms`);
          throw new SimulationTimeoutError(
            timeoutExitCode,
            `simulation did not finish in ${timeout}ms`,
          );
        }),
      );
    }

    await client.simStart({
      firmware: firmwareName,
      elf: elfPath != null ? 'firmware.elf' : undefined,
      chips: chips.map((chip) => chip.name),
      pause: scenario != null,
    });

    if (interactive) {
      process.stdin.pipe(await createSerialMonitorWritable(client));
    }

    if (scenario != null) {
      promises.push(scenario.start(client));
    } else {
      await client.simResume();
    }

    if (promises.length === 0) {
      // wait forever
      await new Promise(() => {});
    }

    // wait until the scenario finishes or a timeout occurs
    await Promise.race(promises);
    // wait for the screenshot to be saved, if any
    await screenshotPromise;
  } finally {
    client.close();
  }
}

main().catch((err) => {
  if (err instanceof SimulationTimeoutError) {
    process.exit(err.exitCode);
  }
  console.error(err);
  process.exit(1);
});
