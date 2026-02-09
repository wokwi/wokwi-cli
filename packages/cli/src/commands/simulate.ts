import {
  APIClient,
  type APIEvent,
  type ChipsLogPayload,
  type SerialMonitorDataPayload,
} from '@wokwi/client';
import { DiagramLinter } from '@wokwi/diagram-lint';
import { RFC2217Server } from '@wokwi/rfc2217';
import chalkTemplate from 'chalk-template';
import type { Command } from 'commander';
import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'fs';
import path, { join } from 'path';
import YAML from 'yaml';
import { ExpectEngine } from '../ExpectEngine.js';
import { SimulationTimeoutError } from '../SimulationTimeoutError.js';
import { TestScenario } from '../TestScenario.js';
import { parseConfig } from '../config.js';
import { DEFAULT_SERVER } from '../constants.js';
import { idfProjectConfig } from '../esp/idfProjectConfig.js';
import { displayLintResults } from '../lint/index.js';
import { loadChips } from '../loadChips.js';
import { readVersion } from '../readVersion.js';
import { DelayCommand } from '../scenario/DelayCommand.js';
import { ExpectChipOutputCommand } from '../scenario/ExpectChipOutputCommand.js';
import { ExpectPinCommand } from '../scenario/ExpectPinCommand.js';
import { SetControlCommand } from '../scenario/SetControlCommand.js';
import { TakeScreenshotCommand } from '../scenario/TakeScreenshotCommand.js';
import { WaitSerialCommand } from '../scenario/WaitSerialCommand.js';
import { WriteSerialCommand } from '../scenario/WriteSerialCommand.js';
import { WebSocketTransport } from '../transport/WebSocketTransport.js';
import { uploadFirmware } from '../uploadFirmware.js';
import { checkForCommandTypo } from '../utils/didYouMean.js';
import { createSerialMonitorWritable } from '../utils/serialMonitorWritable.js';
import { requireToken } from '../utils/token.js';

const millis = 1_000_000;

interface SimulateOptions {
  timeout?: string;
  expectText?: string;
  failText?: string;
  elf?: string;
  diagramFile?: string;
  interactive?: boolean;
  scenario?: string;
  serialLogFile?: string;
  screenshotPart?: string;
  screenshotTime?: string;
  screenshotFile?: string;
  timeoutExitCode?: string;
  quiet?: boolean;
  vcdFile?: string;
}

export function simulateCommand(program: Command): void {
  program
    .argument('[path]', 'Path to project directory', '.')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .option('--expect-text <string>', 'Expect text in serial output')
    .option('--fail-text <string>', 'Fail if text found in serial output')
    .option('--elf <path>', 'ELF file to simulate')
    .option('--diagram-file <path>', 'Path to diagram.json')
    .option('--interactive', 'Redirect stdin to serial')
    .option('--scenario <path>', 'Scenario YAML file')
    .option('--serial-log-file <path>', 'Log serial output to file')
    .option('--screenshot-part <id>', 'Part ID for screenshot')
    .option('--screenshot-time <ms>', 'Screenshot time in milliseconds')
    .option('--screenshot-file <path>', 'Screenshot output file', 'screenshot.png')
    .option('--timeout-exit-code <code>', 'Exit code on timeout', '42')
    .option('-q, --quiet', 'Suppress status messages')
    .option('--vcd-file <path>', 'Output path for VCD (logic analyzer) file')
    .action((projectPath: string, options: SimulateOptions, command: Command) => {
      return runSimulation(projectPath, options, command);
    });
}

async function runSimulation(projectPath: string, options: SimulateOptions, command: Command) {
  // Check if the path argument looks like a typo of a known command
  const knownCommands = command.commands.map((c) => c.name());
  const suggestedCommand = checkForCommandTypo(projectPath, knownCommands);
  if (suggestedCommand && !existsSync(projectPath)) {
    console.error(`error: unknown command '${projectPath}'`);
    console.error(`\nDid you mean '${suggestedCommand}'?\n`);
    console.error(`Run 'wokwi-cli --help' for available commands.`);
    process.exit(1);
  }

  const { sha, version } = readVersion();

  const quiet = options.quiet;
  const elf = options.elf;
  const expectText = options.expectText;
  const failText = options.failText;
  const interactive = options.interactive;
  const diagramFile = options.diagramFile;
  const serialLogFile = options.serialLogFile;
  const scenarioFile = options.scenario;
  const timeout = parseInt(options.timeout ?? '30000', 10);
  const screenshotPart = options.screenshotPart;
  const screenshotTime = options.screenshotTime ? parseInt(options.screenshotTime, 10) : undefined;
  const screenshotFile = options.screenshotFile ?? 'screenshot.png';
  const timeoutExitCode = parseInt(options.timeoutExitCode ?? '42', 10);
  const timeoutNanos = timeout * millis;
  const vcdFile = options.vcdFile;

  const token = requireToken();

  const rootDir = projectPath;
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

  // Lint the diagram before simulation
  const linter = new DiagramLinter();
  const lintResult = linter.lintJSON(diagram);

  if (lintResult.stats.errors > 0 || lintResult.stats.warnings > 0) {
    if (!quiet) {
      console.error(chalkTemplate`{cyan Diagram issues} in {yellow ${diagramFilePath}}:`);
    }
    displayLintResults(lintResult, { quiet });
  }

  const rfc2217ServerPort = config?.wokwi.rfc2217ServerPort;
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
      'expect-chip-output': new ExpectChipOutputCommand(),
      'expect-pin': new ExpectPinCommand(),
      'set-control': new SetControlCommand(),
      'wait-serial': new WaitSerialCommand(),
      'write-serial': new WriteSerialCommand(),
      'take-screenshot': new TakeScreenshotCommand(path.dirname(resolvedScenarioFile)),
    });
    scenario.validate();
  }

  const serialLogStream = serialLogFile ? createWriteStream(serialLogFile) : null;

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

  let rfc2217Server: RFC2217Server | undefined;

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

    if (expectText) {
      promises.push(
        expectEngine.waitForMatch(expectText).then(() => {
          if (!quiet) {
            console.log(chalkTemplate`\n\nExpected text found: {green "${expectText}"}`);
            console.log('TEST PASSED.');
          }
        }),
      );
    }
    if (failText) {
      void expectEngine.waitForMatch(failText).then(() => {
        console.error(
          chalkTemplate`\n\n{red Error:} Unexpected text found: {yellow "${failText}"}`,
        );
        console.error('TEST FAILED.');
        client.close();
        process.exit(1);
      });
    }

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

    if (rfc2217ServerPort) {
      rfc2217Server = new RFC2217Server();
      rfc2217Server.on('error', (err) => {
        console.error(`RFC 2217 server error: ${err}`);
      });
      rfc2217Server.on('connected', () => {
        if (!quiet) {
          console.log('RFC 2217 client connected');
        }
      });
      rfc2217Server.on('data', (data) => {
        void client.serialMonitorWrite(data);
      });
      rfc2217Server.listen(rfc2217ServerPort);
      if (!quiet) {
        console.log(`RFC 2217 server listening on port ${rfc2217ServerPort}`);
      }
    }

    client.listen('serial-monitor:data', (event: APIEvent<SerialMonitorDataPayload>) => {
      let { bytes } = event.payload;
      bytes = scenario?.processSerialBytes(bytes) ?? bytes;
      process.stdout.write(new Uint8Array(bytes));

      serialLogStream?.write(Buffer.from(bytes));
      expectEngine.feed(bytes);

      if (rfc2217Server) {
        for (const byte of bytes) {
          rfc2217Server.write(byte);
        }
      }
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
    // Export VCD if requested
    if (vcdFile) {
      try {
        const result = await client.readVCD();
        if (result.sampleCount > 0) {
          writeFileSync(vcdFile, result.vcd);
          if (!quiet) {
            console.log(`VCD file written to: ${vcdFile}`);
          }
        } else if (!quiet) {
          console.log('No logic analyzer data to export');
        }
      } catch (err) {
        console.error('Error exporting VCD:', (err as Error).message);
      }
    }

    rfc2217Server?.dispose();
    client.close();
  }
}
