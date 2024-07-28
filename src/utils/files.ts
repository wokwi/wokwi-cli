import { access, readFile } from 'fs/promises';

export async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readFileOrNull(path: string) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}
