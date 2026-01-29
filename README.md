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
