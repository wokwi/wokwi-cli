import { execSync } from 'child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const TEST_PROJECT_DIR = 'test-project';
const TEST_REPO = 'https://github.com/wokwi/esp-idf-hello-world.git';

function cloneWithGit(dir: string) {
  console.log('Cloning test project with git...');
  execSync(`git clone ${TEST_REPO} ${dir}`, { stdio: 'inherit' });
}

async function ensureTestProject() {
  if (fsSync.existsSync(TEST_PROJECT_DIR)) {
    console.log('Test project already exists, skipping clone/download...');
    return;
  }

  try {
    cloneWithGit(TEST_PROJECT_DIR);
    return;
  } catch (err) {
    console.log('git clone failed:', (err as Error).message);
    throw new Error('git clone failed; git is required to run integration tests');
  }
}

async function createScenarioFile() {
  const content = `name: "Basic Hello World Test"\nversion: 1\ndescription: "Test that the ESP32 hello world program outputs expected text"\n\nsteps:\n  - name: "Wait for boot and hello message"\n    wait-serial: "Hello world!"\n\n  - name: "Wait for chip information"\n    wait-serial: "This is esp32 chip"\n\n  - name: "Wait for restart message"\n    wait-serial: "Restarting in 10 seconds"\n`;
  await fs.writeFile(path.join(TEST_PROJECT_DIR, 'test-scenario.yaml'), content, 'utf8');
  console.log('Test scenario file created.');
}

async function main() {
  try {
    await ensureTestProject();
    await createScenarioFile();

    if (!process.env.WOKWI_CLI_TOKEN) {
      console.error('Warning: WOKWI_CLI_TOKEN environment variable is not set.');
      console.error('Integration tests require a Wokwi API token to run.');
      console.error('Set WOKWI_CLI_TOKEN environment variable to run these tests.');
      process.exit(1);
    }

    console.log('Running CLI integration tests...');

    console.log('Test 1: Basic expect-text test');
    execSync(`pnpm cli ${TEST_PROJECT_DIR} --timeout 5000 --expect-text Hello`, {
      stdio: 'inherit',
    });

    console.log('Test 2: Scenario file test');
    execSync(`pnpm cli ${TEST_PROJECT_DIR} --scenario test-scenario.yaml --timeout 15000`, {
      stdio: 'inherit',
    });

    console.log('All CLI integration tests passed!');
  } catch (err) {
    console.error('Integration tests failed:', (err as Error).message);
    process.exit(1);
  }
}

await main();
