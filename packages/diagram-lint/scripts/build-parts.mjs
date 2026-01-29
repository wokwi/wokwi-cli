#!/usr/bin/env node
// Combines individual part JSON files into src/registry/parts.json
// Run: node scripts/build-parts.mjs

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const partsDir = join(__dirname, '../src/registry/parts');
const outFile = join(__dirname, '../src/registry/parts.json');

const files = readdirSync(partsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();
const parts = files.map((file) => JSON.parse(readFileSync(join(partsDir, file), 'utf-8')));

writeFileSync(outFile, JSON.stringify(parts, null, 2) + '\n');
console.log(`Built parts.json (${parts.length} parts)`);
