# Development

This document describes how to set up a development environment for the Wokwi CLI and the Wokwi JS client.

## Getting started

Prerequisites:
- Node.js (https://nodejs.org/) (version 20 or higher)
- Git
- PNPM (https://pnpm.io)

We use PNPM workspaces to manage multiple packages in this repository. Install PNPM globally following the official instructions: https://pnpm.io/installation.

## Setting up the repository

Clone the repository and install dependencies:

```bash
git clone https://github.com/wokwi/wokwi-cli
cd wokwi-cli
pnpm install
```

We use Playwright for end-to-end testing. Install the required browsers with:

```bash
pnpm exec playwright install
```

## Packages

The repository contains two main packages:
- `wokwi-cli`: The command-line interface for Wokwi.
- `wokwi-js`: The JavaScript client library used to interact with Wokwi from a browser iframe.

When you run `pnpm` commands from the repository root, the monorepo configuration determines which packages the command runs in. For example, `pnpm build` runs the build across packages, while `pnpm lint` runs `eslint .` for the whole repository.

If you want to build a single package, use the `--filter` flag. For example, to build only the `wokwi-cli` package:

```bash
pnpm --filter wokwi-cli build
```

Or change into the package directory and run the command there:

```bash
cd packages/wokwi-cli
pnpm build
```

## Running the CLI in development mode

Build the packages first:

```bash
pnpm build
```

Then run the CLI from the `wokwi-cli` package directory:

```bash
cd packages/wokwi-cli
pnpm cli [arguments]

# Example: show the help screen
pnpm cli -h
```

Example output:

```bash
Wokwi CLI v0-development (f33d9d579b0a)

  USAGE

      $ wokwi-cli [options] [path/to/project]

  OPTIONS
      --help, -h                  Shows this help message and exit
...
```

## Running tests locally

Before running tests, make sure you have built the packages and installed Playwright browsers:

```bash
pnpm build
pnpm exec playwright install
```

We have several types of tests:
- Unit tests (Vitest)
- End-to-end tests (Playwright)
- Integration tests that run the CLI against real Wokwi projects

To run all tests:

```bash
pnpm test
```

To run tests separately, inspect the `scripts` section in the root `package.json`.

## Automatic tests (CI)

The repository uses GitHub Actions to run tests on every push and pull request. The workflow files live in `.github/workflows/` and contain steps to set up the environment, install dependencies, build packages, and run tests.

If you fork the repository, you must enable GitHub Actions for your fork and add the `WOKWI_CLI_TOKEN` secret.

Set the `WOKWI_CLI_TOKEN` secret in your fork under `Settings` > `Secrets and variables` > `Actions` > `New repository secret`.

Instructions for obtaining the `WOKWI_CLI_TOKEN` are in the `README.md` (see the Usage section).
