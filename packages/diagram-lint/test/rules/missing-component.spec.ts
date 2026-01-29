import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { missingComponentRule } from '../../src/rules/missing-component.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('missing-component rule', () => {
  it('should pass when all referenced parts exist', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
      ],
      connections: [['uno:13', 'led1:A', 'green', []]],
      dependencies: {},
    };

    const issues = missingComponentRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect missing source part', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', top: 100, left: 100 }],
      connections: [['nonexistent:13', 'led1:A', 'green', []]],
      dependencies: {},
    };

    const issues = missingComponentRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.missingPartId).toBe('nonexistent');
    expect(issues[0].context?.position).toBe('source');
  });

  it('should detect missing target part', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 }],
      connections: [['uno:13', 'nonexistent:A', 'green', []]],
      dependencies: {},
    };

    const issues = missingComponentRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.missingPartId).toBe('nonexistent');
    expect(issues[0].context?.position).toBe('target');
  });

  it('should allow $serialMonitor as a virtual part', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 }],
      connections: [
        ['uno:0', '$serialMonitor:RX', 'green', []],
        ['$serialMonitor:TX', 'uno:1', 'green', []],
      ],
      dependencies: {},
    };

    const issues = missingComponentRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });
});
