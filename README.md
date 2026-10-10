# wokwi-cli

Wokwi Simulation API command line interface.

## Installation

Download the latest release from the [GitHub Releases page](https://github.com/wokwi/wokwi-cli/releases/latest). Rename the file to `wokwi-cli` (or `wokwi-cli.exe` on Windows), and put it in your `PATH`.

On Linux and macOS, you can also install the CLI using the following command:

```bash
curl -L https://wokwi.com/ci/install.sh | sh
```

And on Windows:

```powershell
iwr https://wokwi.com/ci/install.ps1 -useb | iex
```

## Usage

First, ensure that you set the `WOKWI_CLI_TOKEN` environment variable to your Wokwi API token. You can get your token from your [Wokwi CI Dashboard](https://wokwi.com/dashboard/ci).

```
wokwi-cli [directory]
```

The given directory should have a `wokwi.toml` file, as explained in [the documentation](https://docs.wokwi.com/vscode/project-config#wokwitoml).

For example, you could clone the [ESP32 Hello World binaries repo](https://github.com/wokwi/esp-idf-hello-world), and point the CLI at the `esp-idf-hello-world` directory:

```bash
git clone https://github.com/wokwi/esp-idf-hello-world
cd esp-idf-hello-world
wokwi-cli .
```

### Logic Analyzer VCD Export

If your diagram includes a [logic analyzer](https://docs.wokwi.com/parts/wokwi-logic-analyzer), you can export the captured signals to a VCD file:

```bash
wokwi-cli . --vcd-file logic.vcd
```

### Instruction Coverage

For ESP32 family boards, the CLI can record which instructions ran during the simulation and how often, including how many times each branch was taken:

```bash
wokwi-cli . --coverage-file coverage.json --expect-text "All tests passed"
```

The JSON file holds a `[pc, hits, taken]` triple for every executed address; map the addresses back to source lines with the symbols in your ELF file.

### Debugging with GDB

Set `gdbServerPort` in `wokwi.toml` (or pass `--gdb-server-port <port>`, short `-g`) to debug the simulated firmware with gdb:

```toml
[wokwi]
version = 1
firmware = 'build/hello_world.bin'
elf = 'build/hello_world.elf'
gdbServerPort = 3333
```

The CLI then listens for gdb on that port and starts the simulation paused, so you can set breakpoints before the firmware runs. Connect with the gdb that matches your target, for example:

```bash
xtensa-esp32-elf-gdb build/hello_world.elf -ex 'target remote localhost:3333'
```

The default 30 second simulation timeout still applies; pass `--timeout 0` for an open-ended debugging session.

### ESP-IDF Backtrace Decoding

For detected ESP-IDF projects with an ELF file, the CLI decodes addresses from `Backtrace:` lines
using the `addr2line` executable named by the project's `monitor_toolprefix` in
`build/project_description.json`. The executable must be available on `PATH`, as it is when the
ESP-IDF environment is active. The original serial output is unchanged; decoded frames are written
to stderr. Set `ESP_MONITOR_DECODE=0` to disable decoding.

### SD card contents

If your diagram includes a [micro SD card](https://docs.wokwi.com/parts/wokwi-microsd-card), the CLI can preload it and read it back. The simplest way is to put the files in a `sdcard/` directory next to `wokwi.toml`: it is copied onto a freshly formatted 8 MB card when the simulation starts. For more control, add a `[[sdcard]]` section to `wokwi.toml`:

```toml
[[sdcard]]
# part = 'sd1'        # diagram part id; only needed when the diagram has more than one card
folder = 'assets/sd'  # directory tree copied onto the card (or: image = 'card.img' for a raw disk image)
size = '32M'          # card capacity, default 8M (the Wokwi CI server allows up to 64M)
writeback = true      # write the card contents back to the folder / image when the simulation ends
```

Write-back mirrors the card into the folder: files the firmware created or changed are written, files it deleted are removed. An `image` is replaced atomically. The command line can override all of this:

```
--sdcard <path>          folder or .img file for the card; <part>=<path> targets a specific card (repeatable)
--sdcard-size <size>     e.g. 32M
--sdcard-writeback       write the final contents back to the source
--sdcard-out <path>      write the final contents here instead (.img for an image, otherwise a folder); implies write-back
--no-sdcard              run with an empty card, ignoring wokwi.toml and the sdcard/ folder
```

For example, to run a test against a fixture and keep whatever the firmware wrote:

```bash
wokwi-cli . --sdcard tests/fixtures/sd --sdcard-out build/sd-out --expect-text "config saved"
```

## Configuration Wizard

To generate a `wokwi.toml` and a default `diagram.json` files for your project, run:

```bash
wokwi-cli init
```

This will ask you a few questions and will create the necessary files in the current directory. If you want to create the files in a different directory, pass the directory name as an argument:

```bash
wokwi-cli init my-project
```

## Custom Chip Compilation

The CLI can compile custom chips written in C to WebAssembly for use in Wokwi simulations. It automatically downloads and installs the required WASI-SDK toolchain.

```bash
# Compile a custom chip
wokwi-cli chip compile my-chip.c

# Compile multiple source files
wokwi-cli chip compile main.c utils.c -o chip.wasm

# Generate a Makefile for advanced users
wokwi-cli chip makefile -n my-chip main.c utils.c
```

The compiler will automatically:

- Download and install WASI-SDK if not present (`~/.wokwi/wasi-sdk`)
- Download `wokwi-api.h` if not present in the project directory
- Generate a `.wasm` file ready for use in Wokwi

You can also set the `WASI_SDK_PATH` environment variable to use a custom WASI-SDK installation.

For more information about creating custom chips, see the [Custom Chips documentation](https://docs.wokwi.com/chips-api/getting-started).

## Diagram Linting

Validate your `diagram.json` file for errors and warnings:

```bash
wokwi-cli lint
```

The linter checks for common issues like unknown part types, invalid pin connections, and missing components. By default, it fetches the latest board definitions from the Wokwi registry.

Options:

- `--ignore-warnings` - Only report errors
- `--warnings-as-errors` - Exit with error code if warnings are found (useful for CI)
- `--offline` - Skip downloading latest board definitions

## MCP Server

The MCP server is an experimental feature that allows you to use the Wokwi CLI as a MCP server. You can use it to integrate the Wokwi CLI with AI agents.

To configure your AI agent to use the MCP server, add the following to your agent's configuration:

```json
{
  "servers": {
    "Wokwi": {
      "type": "stdio",
      "command": "wokwi-cli",
      "args": ["mcp"],
      "env": {
        "WOKWI_CLI_TOKEN": "${input:wokwi-cli-token}"
      }
    }
  }
}
```

## Development

All information about developing the Wokwi CLI can be found in [DEVELOPMENT.md](DEVELOPMENT.md).

## License

[The MIT License (MIT)](LICENSE)
