import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createConfigForIDFProject, idfProjectConfig } from './idfProjectConfig.js';

describe('createConfigForIDFProject', () => {
  it('should create a config for an IDF project', () => {
    const config = createConfigForIDFProject({
      project_path: '/dev/esp/idf-master/examples/get-started/hello_world',
      build_dir: '/dev/esp/idf-master/examples/get-started/hello_world/build',
      app_elf: 'hello_world.elf',
    });
    expect(config).toMatchInlineSnapshot(`
      "# Wokwi Configuration File
      # Reference: https://docs.wokwi.com/vscode/project-config
      [wokwi]
      version = 1
      firmware = 'build/flasher_args.json'
      elf = 'build/hello_world.elf'
      gdbServerPort = 3333
      "
    `);
  });
});

describe('idfProjectConfig', () => {
  function setupTempProject(boardType: string, idfTarget: string) {
    const dir = mkdtempSync(path.join(tmpdir(), 'wokwi-test-'));
    const diagramPath = path.join(dir, 'diagram.json');
    const projectDescPath = path.join(dir, 'project_description.json');
    const configPath = path.join(dir, 'wokwi.toml');
    writeFileSync(
      diagramPath,
      JSON.stringify({ version: 1, parts: [{ type: boardType, id: 'esp' }], connections: [] }),
    );
    writeFileSync(projectDescPath, JSON.stringify({ target: idfTarget }));
    return { dir, diagramPath, projectDescPath, configPath };
  }

  it('should accept esp32-s3-box-3 diagram with esp32s3 IDF target', () => {
    const { dir, diagramPath, projectDescPath, configPath } = setupTempProject(
      'board-esp32-s3-box-3',
      'esp32s3',
    );

    const result = idfProjectConfig({
      rootDir: dir,
      configPath,
      diagramFilePath: diagramPath,
      projectDescriptionPath: projectDescPath,
    });

    expect(result).toBe(true);
  });

  it('should reject esp32-s3-box-3 diagram with esp32 IDF target', () => {
    const { dir, diagramPath, projectDescPath, configPath } = setupTempProject(
      'board-esp32-s3-box-3',
      'esp32',
    );

    const result = idfProjectConfig({
      rootDir: dir,
      configPath,
      diagramFilePath: diagramPath,
      projectDescriptionPath: projectDescPath,
    });

    expect(result).toBe(false);
  });
});
