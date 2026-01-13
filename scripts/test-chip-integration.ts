import { execSync } from 'child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURE_DIR = path.join(__dirname, '..', 'test', 'chip-integration', 'fixtures');

async function compileChip() {
  console.log('Compiling test chip...');

  const sourceFile = path.join(FIXTURE_DIR, 'test-chip.c');
  const outputFile = path.join(FIXTURE_DIR, 'test-chip.chip.wasm');

  execSync(`pnpm cli chip compile "${sourceFile}" -o "${outputFile}"`, {
    stdio: 'inherit',
  });

  console.log('Chip compiled successfully');
}

async function runSimulation() {
  console.log('Running simulation with custom chip...');

  const env: Record<string, string> = {
    ...process.env,
  } as Record<string, string>;

  // Run the CLI and capture output
  try {
    execSync(`pnpm cli ${FIXTURE_DIR} --timeout 200 --scenario chip.scenario.yaml`, {
      stdio: 'inherit',
      env,
    });
  } catch (error) {
    // Timeout is expected - we just want to see if the chip loads
    const exitCode = (error as { status?: number }).status;
    if (exitCode === 42) {
      // Timeout exit code - this is expected
      console.log('Simulation timed out (expected)');
    } else {
      throw error;
    }
  }
}

async function runChipIntegrationTest() {
  console.log('\n=== Test: Integration with Simulation ===');

  await compileChip();
  await runSimulation();

  console.log('Integration test passed!\n');
}

async function main() {
  console.log('=== Wokwi CLI Chip Integration Tests ===\n');

  await runChipIntegrationTest();

  console.log('\n=== All chip integration tests passed! ===');
}

await main();
