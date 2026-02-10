import _Ajv from 'ajv';
import _addFormats from 'ajv-formats';
import chalkTemplate from 'chalk-template';
import { readFileSync } from 'fs';
import chipSchema from './chip.schema.json' with { type: 'json' };

const Ajv = _Ajv.default ?? _Ajv;
const addFormats = _addFormats.default ?? _addFormats;

export function validateChipJson(chipJsonPath: string) {
  let chipJson: unknown;
  try {
    chipJson = JSON.parse(readFileSync(chipJsonPath, 'utf-8'));
  } catch (e) {
    console.warn(
      chalkTemplate`{yellow Warning:} Failed to parse {cyan ${chipJsonPath}}: ${(e as Error).message}`,
    );
    return;
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(chipSchema as Record<string, unknown>);

  if (!validate(chipJson)) {
    console.warn();
    console.warn(chalkTemplate`{yellow Warning:} chip.json has validation errors:`);
    for (const error of validate.errors ?? []) {
      if (error.keyword === 'if') {
        continue;
      }
      const path = error.instancePath || '/';
      console.warn(chalkTemplate`  {yellow -} {cyan ${path}} ${error.message}`);
    }
  }
}
