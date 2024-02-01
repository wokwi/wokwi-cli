import { execSync } from 'child_process';
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = execSync('git rev-parse --short=12 HEAD').toString().trim();

const installCommands = {
  win32: 'iwr https://wokwi.com/ci/install.ps1 -useb | iex',
  default: 'curl -L https://wokwi.com/ci/install.sh | sh',
};

mkdirSync('dist/bin', { recursive: true });
writeFileSync(
  'dist/bin/version.json',
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

const options = {
  platform: 'node',
  entryPoints: ['./src/main.ts'],
  outfile: './dist/cli.cjs',
  bundle: true,
  define: {
    'process.env.WOKWI_CONST_CLI_VERSION': JSON.stringify(version),
    'process.env.WOKWI_CONST_CLI_SHA': JSON.stringify(sha),
  },
};

build(options).catch(() => process.exit(1));
