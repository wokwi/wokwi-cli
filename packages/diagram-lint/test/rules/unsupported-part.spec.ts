import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { unsupportedPartRule } from '../../src/rules/unsupported-part.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('unsupported-part rule', () => {
  it('should pass for documented parts', () => {
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

    const issues = unsupportedPartRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should warn about undocumented parts', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-splendida', id: 'neo', top: 100, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = unsupportedPartRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe('neo');
    expect(issues[0].severity).toBe('info');
  });

  it('should not flag custom chips', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'chip-custom', id: 'chip1', top: 100, left: 100 }],
      connections: [],
      dependencies: {},
    };

    const issues = unsupportedPartRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should not flag unknown parts (handled by another rule)', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-totally-unknown', id: 'foo', top: 100, left: 100 }],
      connections: [],
      dependencies: {},
    };

    const issues = unsupportedPartRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });
});
