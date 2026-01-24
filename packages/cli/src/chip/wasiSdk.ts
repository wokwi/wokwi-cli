import chalkTemplate from 'chalk-template';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
} from 'fs';
import { arch, homedir, platform } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { extract } from 'tar';

export const WASI_SDK_VERSION = '25';
export const MIN_WASI_SDK_VERSION = 20;

export function getWokwiDir(): string {
  return join(homedir(), '.wokwi');
}

export function getWasiSdkDir(): string {
  return join(getWokwiDir(), 'wasi-sdk');
}

export function getPlatformSuffix(): string {
  const os = platform();
  const cpuArch = arch();

  if (os === 'linux') {
    return cpuArch === 'arm64' ? 'arm64-linux' : 'x86_64-linux';
  } else if (os === 'darwin') {
    return cpuArch === 'arm64' ? 'arm64-macos' : 'x86_64-macos';
  } else if (os === 'win32') {
    return 'x86_64-windows';
  }
  throw new Error(`Unsupported platform: ${os}-${cpuArch}`);
}

export function getWasiSdkDownloadUrl(): string {
  const suffix = getPlatformSuffix();
  return `https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/wasi-sdk-${WASI_SDK_VERSION}.0-${suffix}.tar.gz`;
}

async function downloadFile(url: string, destPath: string, quiet: boolean): Promise<void> {
  if (!quiet) {
    console.log(chalkTemplate`  Downloading from {cyan ${url}}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const fileStream = createWriteStream(destPath);
  // @ts-expect-error - response.body is a ReadableStream
  await pipeline(response.body, fileStream);
}

export function checkWasiSdkVersion(wasiSdkPath: string): { valid: boolean; version?: string } {
  try {
    const versionFile = join(wasiSdkPath, 'VERSION');
    if (existsSync(versionFile)) {
      const versionContent = readFileSync(versionFile, 'utf-8').trim();
      const majorVersion = parseInt(versionContent.split('.')[0], 10);
      if (majorVersion >= MIN_WASI_SDK_VERSION) {
        return { valid: true, version: versionContent };
      }
      return { valid: false, version: versionContent };
    }

    const clangPath = join(wasiSdkPath, 'bin', platform() === 'win32' ? 'clang.exe' : 'clang');
    if (existsSync(clangPath)) {
      return { valid: true, version: 'unknown' };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

async function installWasiSdk(quiet: boolean): Promise<string> {
  const wokwiDir = getWokwiDir();
  const wasiSdkDir = getWasiSdkDir();

  if (!existsSync(wokwiDir)) {
    mkdirSync(wokwiDir, { recursive: true });
  }

  const downloadUrl = getWasiSdkDownloadUrl();
  const tarFile = join(wokwiDir, 'wasi-sdk.tar.gz');

  console.log(chalkTemplate`{cyan Installing WASI-SDK...}`);
  console.log(chalkTemplate`  This is a one-time setup that may take a few minutes.`);

  await downloadFile(downloadUrl, tarFile, quiet);

  if (!quiet) {
    console.log(chalkTemplate`  Extracting...`);
  }

  const suffix = getPlatformSuffix();
  const extractedDir = join(wokwiDir, `wasi-sdk-${WASI_SDK_VERSION}.0-${suffix}`);

  try {
    if (existsSync(wasiSdkDir)) {
      rmSync(wasiSdkDir, { recursive: true, force: true });
    }
    if (existsSync(extractedDir)) {
      rmSync(extractedDir, { recursive: true, force: true });
    }

    await extract({ file: tarFile, cwd: wokwiDir });
    renameSync(extractedDir, wasiSdkDir);
    unlinkSync(tarFile);
  } catch (e) {
    throw new Error(`Failed to extract WASI-SDK: ${(e as Error).message}`);
  }

  console.log(chalkTemplate`{green WASI-SDK installed successfully!}`);
  return wasiSdkDir;
}

export async function ensureWasiSdk(quiet: boolean): Promise<string> {
  const envWasiSdk = process.env.WASI_SDK_PATH;
  if (envWasiSdk) {
    if (!existsSync(envWasiSdk)) {
      console.error(
        chalkTemplate`{red Error:} WASI_SDK_PATH is set to {yellow ${envWasiSdk}} but the directory does not exist.`,
      );
      process.exit(1);
    }

    const { valid, version } = checkWasiSdkVersion(envWasiSdk);
    if (!valid) {
      console.error(
        chalkTemplate`{yellow Warning:} WASI-SDK at {yellow ${envWasiSdk}} may be outdated or invalid.`,
      );
      console.error(
        chalkTemplate`  Found version: {yellow ${version ?? 'unknown'}}, recommended: {green ${WASI_SDK_VERSION}+}`,
      );
      console.error(
        chalkTemplate`  Continuing anyway, but if compilation fails, please update WASI-SDK.`,
      );
    } else if (!quiet) {
      console.log(
        chalkTemplate`Using WASI-SDK from {cyan WASI_SDK_PATH}: ${envWasiSdk} (v${version})`,
      );
    }
    return envWasiSdk;
  }

  const defaultWasiSdk = getWasiSdkDir();
  if (existsSync(defaultWasiSdk)) {
    const { valid, version } = checkWasiSdkVersion(defaultWasiSdk);
    if (valid) {
      if (!quiet) {
        console.log(chalkTemplate`Using WASI-SDK from {cyan ${defaultWasiSdk}} (v${version})`);
      }
      return defaultWasiSdk;
    }
    if (!quiet) {
      console.log(chalkTemplate`{yellow WASI-SDK version outdated, reinstalling...}`);
    }
  }

  return installWasiSdk(quiet);
}
