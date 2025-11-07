import { describe, expect, it } from 'vitest';
import { createConfigForIDFProject } from './idfProjectConfig.js';

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
