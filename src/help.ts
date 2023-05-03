import chalk from 'chalk';

export function cliHelp() {
  console.log(chalk`
  {bold USAGE}

      {dim $} {bold wokwi-cli} [options] [path/to/project]

  {bold OPTIONS}
      {green --help}, {green -h}                  Shows this help message and exit
      {green --quiet}, {green -q}                 Quiet: do not print version or status messages
      {green --expect-text} <string>      Expect the given text in the output
      {green --fail-text} <string>        Fail if the given text is found in the output
      {green --timeout} <number>          Timeout in simulation milliseconds (default: 0 = none)

  {bold EXAMPLES}

      Running a simulation for 5 seconds, and expecting "Hello World" in the output (assuming wokwi.toml in the current directory):

      {dim $} {bold wokwi-cli} {green --timeout} 5000 {green --expect-text} "Hello World"
  
`);
}
