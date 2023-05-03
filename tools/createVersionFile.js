const fs = require('fs');
const version = require('../package.json').version;
const sha = require('child_process').execSync('git rev-parse --short=12 HEAD').toString().trim();
fs.writeFileSync(
  'dist/version.json',
  JSON.stringify({
    version,
    sha,
  })
);
