import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const options = {
  entryPoints: [join(rootDir, 'src/index.ts')],
  outfile: join(rootDir, 'dist/wokwi-client-js.browser.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  // Explicitly mark Node.js-only packages as external
  external: ['ws', 'stream', 'buffer'],
  banner: {
    js: `// Browser bundle of wokwi-client-js
// Note: serialMonitorWritable() requires Node.js and won't work in browsers
// Use MessagePortTransport for browser communication with Wokwi Simulator
`,
  },
};

// Build the browser bundle
build(options)
  .then(() => {
    console.log('✓ Browser bundle created: dist/wokwi-client-js.browser.js');
  })
  .catch((error) => {
    console.error('✗ Browser bundle failed:', error);
    process.exit(1);
  });

