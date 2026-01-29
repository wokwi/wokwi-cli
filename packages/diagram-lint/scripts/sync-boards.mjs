#!/usr/bin/env node
// Syncs board definitions from wokwi-boards bundle.json
// Run: node scripts/sync-boards.mjs

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const partsDir = join(__dirname, '../src/registry/parts');
const BUNDLE_URL = 'https://wokwi.github.io/wokwi-boards/boards.json';

async function fetchBundle() {
  const response = await fetch(BUNDLE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function extractPins(boardDef) {
  const pins = Object.keys(boardDef.def.pins || {});
  // Sort pins: numeric first (sorted numerically), then alphabetic
  return pins.sort((a, b) => {
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    const aIsNum = !isNaN(aNum);
    const bIsNum = !isNaN(bNum);
    if (aIsNum && bIsNum) return aNum - bNum;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a.localeCompare(b);
  });
}

function loadExistingPart(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

async function main() {
  console.log('Fetching wokwi-boards bundle...');
  const bundle = await fetchBundle();
  const boardIds = Object.keys(bundle);
  console.log(`Found ${boardIds.length} boards in bundle`);

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const boardId of boardIds) {
    const boardDef = bundle[boardId];
    const partType = `board-${boardId}`;
    const filePath = join(partsDir, `${partType}.json`);
    const pins = extractPins(boardDef);

    const existing = loadExistingPart(filePath);

    const partDef = {
      type: partType,
      pins,
      documented: existing?.documented ?? false,
      isBoard: true,
      category: 'boards',
    };

    if (existing) {
      // Check if pins changed
      const pinsChanged = JSON.stringify(existing.pins) !== JSON.stringify(pins);
      if (pinsChanged) {
        writeFileSync(filePath, JSON.stringify(partDef, null, 2) + '\n');
        console.log(`  Updated: ${partType} (${pins.length} pins)`);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      writeFileSync(filePath, JSON.stringify(partDef, null, 2) + '\n');
      console.log(`  Created: ${partType} (${pins.length} pins)`);
      created++;
    }
  }

  console.log(`\nSummary: ${created} created, ${updated} updated, ${unchanged} unchanged`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
