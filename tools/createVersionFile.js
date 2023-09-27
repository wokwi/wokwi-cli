import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const sha = execSync('git rev-parse --short=12 HEAD').toString().trim();

writeFileSync(
  'dist/version.js',
  `export const { version, sha } = ${JSON.stringify({ version, sha })}\n`,
);
