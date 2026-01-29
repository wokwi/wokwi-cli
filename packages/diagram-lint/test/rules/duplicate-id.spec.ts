import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { duplicateIdRule } from '../../src/rules/duplicate-id.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('duplicate-id rule', () => {
  it('should pass when all IDs are unique', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-led', id: 'led1', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led2', top: 0, left: 100 },
        { type: 'wokwi-led', id: 'led3', top: 0, left: 200 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = duplicateIdRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect duplicate IDs', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-led', id: 'led1', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 0, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = duplicateIdRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('duplicate-id');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].partId).toBe('led1');
  });

  it('should detect multiple duplicates', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-led', id: 'led1', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 0, left: 100 },
        { type: 'wokwi-led', id: 'led1', top: 0, left: 200 },
        { type: 'wokwi-resistor', id: 'r1', top: 50, left: 0 },
        { type: 'wokwi-resistor', id: 'r1', top: 50, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = duplicateIdRule.check(createContext(diagram));
    expect(issues).toHaveLength(3); // 2 duplicates for led1, 1 for r1
  });
});
