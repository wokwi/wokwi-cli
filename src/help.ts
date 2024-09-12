import chalkTemplate from 'chalk-template';

export function cliHelp() {
  console.log(chalkTemplate`
  {bold USAGE}

      {dim $} {bold wokwi-cli} [options] [path/to/project]

  {bold OPTIONS}
      {green --help}, {green -h}                  Shows this help message and exit
      {green --quiet}, {green -q}                 Quiet: do not print version or status messages
      {green --expect-text} <string>      Expect the given text in the output
      {green --fail-text} <string>        Fail if the given text is found in the output
      {green --elf} <path>                ELF file to simulate (default: read from wokwi.toml)
      {green --diagram-file} <path>       Path to the diagram.json file, relative to project root (default: diagram.json)
      {green --interactive}               Redirect stdin to the simulated serial port
      {green --scenario} <path>           Run the given scenario (yaml) file, path is relative to project root
      {green --serial-log-file} <path>    Save the serial monitor output to the given file
      {green --screenshot-part} <string>  Take a screenshot of the given part id (from diagram.json)
      {green --screenshot-time} <number>  Time in simulation milliseconds to take the screenshot
      {green --screenshot-file} <string>  File name to save the screenshot to (default: screenshot.png)
      {green --timeout} <number>          Timeout in simulation milliseconds (default: 30000)
      {green --timeout-exit-code} <number> Process exit code when timeout is reached (default: 42)

  {bold PROJECT CONFIGURATION}

      To configure your project for Wokwi, run the "wokwi-cli init" command in the project directory.
      This will ask you a few questions and create both wokwi.toml and diagram.json files.

  {bold EXAMPLES}

      Run the simulation for 5 seconds, and expect "Hello World" in the output (assuming wokwi.toml in the current directory):

      {dim $} {bold wokwi-cli} {green --timeout} 5000 {green --expect-text} "Hello World"

      Run the simulation, Take a screenshot of the "lcd1" part after 4.5 seconds, and then exit:

      {dim $} {bold wokwi-cli} {green --screenshot-part} lcd1 {green --screenshot-time} 4500 {green --timeout} 4500 {green --timeout-exit-code} 0
  
`);
}
