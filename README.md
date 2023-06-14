# wokwi-cli

Wokwi Simulation API command line interface.

## Installation

Download the latest release from the [GitHub Releases page](https://github.com/wokwi/wokwi-cli/releases/latest). Rename the file to `wokwi-cli` (or `wokwi-cli.exe` on Windows), and put it in your `PATH`.

On Linux (x64), the CLI can be installed using the following commands:

```bash
sudo wget -O /usr/local/bin/wokwi-cli https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-linuxstatic-x64
sudo chmod +x /usr/local/bin/wokwi-cli
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

## Development

Clone the repository, install the npm depenedencies, and then run the CLI:

```bash
git clone https://github.com/wokwi/wokwi-cli
cd wokwi-cli
npm install
npm start
```

To pass command line arguments to the cli, use `npm start -- [arguments]`. For example, to see the help screen, run:

```
npm start -- -h
```

## License

[The MIT License (MIT)](LICENSE)
