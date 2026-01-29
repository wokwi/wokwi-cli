import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { unknownPartTypeRule } from '../../src/rules/unknown-part-type.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('unknown-part-type rule', () => {
  it('should pass with known part types', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
        { type: 'wokwi-resistor', id: 'r1', top: 50, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = unknownPartTypeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect unknown part types', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-foobar', id: 'foo', top: 100, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = unknownPartTypeRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe('foo');
    expect(issues[0].context?.partType).toBe('wokwi-foobar');
  });

  it('should allow custom chips (chip-* prefix)', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'chip-my-custom-chip', id: 'chip1', top: 100, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = unknownPartTypeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should allow custom boards (board-* prefix)', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'board-my-custom-board', id: 'board1', top: 0, left: 0 }],
      connections: [],
      dependencies: {},
    };

    const issues = unknownPartTypeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });
});
