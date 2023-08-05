import { execSync } from "child_process";
import { build } from "esbuild";
import { readFileSync } from "fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const sha = execSync("git rev-parse --short=12 HEAD").toString().trim();

const options = {
  platform: "node",
  entryPoints: ["./src/main.ts"],
  outfile: "./dist/cli.cjs",
  bundle: true,
  define: {
    "process.env.WOKWI_CONST_CLI_VERSION": JSON.stringify(version),
    "process.env.WOKWI_CONST_CLI_SHA": JSON.stringify(sha),
  },
};

build(options).catch(() => process.exit(1));
