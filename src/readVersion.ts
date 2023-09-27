import { execSync } from 'child_process';
import { sha, version } from './version.js';

export function readVersion() {
  const result = { sha, version };
  if (sha.length === 0) {
    result.sha = execSync('git rev-parse --short=12 HEAD').toString().trim();
  }
  return result;
}
