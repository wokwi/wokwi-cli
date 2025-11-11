import { execSync } from 'child_process';
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get version and SHA
const { version } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const sha = execSync('git rev-parse --short=12 HEAD', { cwd: rootDir }).toString().trim();

// Generate version.json for distribution
const installCommands = {
  win32: 'iwr https://wokwi.com/ci/install.ps1 -useb | iex',
  default: 'curl -L https://wokwi.com/ci/install.sh | sh',
};

mkdirSync(join(rootDir, 'dist/bin'), { recursive: true });
writeFileSync(
  join(rootDir, 'dist/bin/version.json'),
  JSON.stringify(
    {
      version,
      sha,
      install: installCommands,
    },
    null,
    2,
  ),
);

// Bundle the CLI
const options = {
  platform: 'node',
  entryPoints: [join(rootDir, 'src/main.ts')],
  outfile: join(rootDir, 'dist/cli.cjs'),
  bundle: true,
  define: {
    'process.env.WOKWI_CONST_CLI_VERSION': JSON.stringify(version),
    'process.env.WOKWI_CONST_CLI_SHA': JSON.stringify(sha),
  },
};

build(options).catch(() => process.exit(1));

