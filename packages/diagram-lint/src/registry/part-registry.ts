import type { AttributeDefinition, BoardBundle, PartDefinition } from '../types.js';
import { partDefinitions } from './part-definitions.js';

/**
 * URL for fetching remote board definitions from the wokwi-boards repository
 */
export const REMOTE_BOARDS_URL = 'https://wokwi.github.io/wokwi-boards/boards.json';

/**
 * Registry for looking up part definitions by type
 */
export class PartRegistry {
  private parts: Map<string, PartDefinition>;

  constructor() {
    this.parts = new Map();
    for (const part of partDefinitions) {
      this.parts.set(part.type, part);
    }
  }

  /**
   * Load board definitions from a wokwi-boards bundle.json
   * Fetched from: https://wokwi.github.io/wokwi-boards/bundle.json
   */
  loadBoardsBundle(bundle: BoardBundle): number {
    let count = 0;
    for (const [boardId, entry] of Object.entries(bundle)) {
      const partType = `board-${boardId}`;
      const pins = Object.keys(entry.def.pins || {}).sort((a, b) => {
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        const aIsNum = !isNaN(aNum);
        const bIsNum = !isNaN(bNum);
        if (aIsNum && bIsNum) return aNum - bNum;
        if (aIsNum) return -1;
        if (bIsNum) return 1;
        return a.localeCompare(b);
      });

      const existing = this.parts.get(partType);
      this.parts.set(partType, {
        type: partType,
        pins,
        documented: existing?.documented ?? false,
        isBoard: true,
        category: 'boards',
      });
      count++;
    }
    return count;
  }

  has(type: string): boolean {
    return this.parts.has(type);
  }

  isBoard(type: string): boolean {
    return this.parts.get(type)?.isBoard ?? false;
  }

  isDocumented(type: string): boolean {
    return this.parts.get(type)?.documented ?? false;
  }

  isValidPin(type: string, pin: string): boolean {
    const part = this.parts.get(type);
    return part ? part.pins.includes(pin) : false;
  }

  getPins(type: string): string[] {
    return this.parts.get(type)?.pins ?? [];
  }

  getAttributes(type: string): AttributeDefinition[] {
    return this.parts.get(type)?.attrs ?? [];
  }

  isCustomChip(type: string): boolean {
    return type.startsWith('chip-');
  }

  isCustomBoard(type: string): boolean {
    return type.startsWith('board-') && !this.parts.has(type);
  }
}
