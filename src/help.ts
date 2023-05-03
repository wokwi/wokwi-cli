import chalk from 'chalk';

export function cliHelp() {
  console.log(chalk`
  {bold USAGE}

      {dim $} {bold wokwi-cli} [options] [path/to/project]

  {bold OPTIONS}
      {green --help}, {green -h}                  Shows this help message and exit
      {green --quiet}, {green -q}                 Quiet: do not print version or status messages
`);
}
