import type { PartDefinition } from '../types.js';
import partsJson from './parts.json' with { type: 'json' };

export const partDefinitions: PartDefinition[] = partsJson as PartDefinition[];
