# wokwi-cli

Wokwi Simulation API command line interface.

## Usage

```sh
npx wokwi-cli [directory]
```

The given directory should have a `wokwi.toml` file, as explained in [the documentation](https://docs.wokwi.com/vscode/project-config#wokwitoml).

Make sure to set your Wokwi CLI token in your environment

```sh
WOKWI_CLI_TOKEN=<YOUR CLI Token>
# in windows: set WOKWI_CLI_TOKEN=<YOUR CLI Token>
```

For example, you could clone the [ESP32 Hello World binaries repo](https://github.com/wokwi/esp-idf-hello-world), and point the CLI at the `esp-idf-hello-world` directory:

```bash
git clone https://github.com/wokwi/esp-idf-hello-world
cd esp-idf-hello-world
npx wokwi-cli .
```

## License

[The MIT License (MIT)](LICENSE)
