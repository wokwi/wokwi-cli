import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { redundantPartsRule } from '../../src/rules/redundant-parts.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('redundant-parts rule', () => {
  it('should pass when all parts have connections', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
      ],
      connections: [['uno:13', 'led1:A', 'green', []]],
      dependencies: {},
    };

    const issues = redundantPartsRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect unconnected parts', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
        { type: 'wokwi-led', id: 'led2', top: 100, left: 200 },
      ],
      connections: [['uno:13', 'led1:A', 'green', []]],
      dependencies: {},
    };

    const issues = redundantPartsRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe('led2');
    expect(issues[0].severity).toBe('warning');
  });

  it('should not flag boards without connections', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 }],
      connections: [],
      dependencies: {},
    };

    const issues = redundantPartsRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should not flag text elements', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-text', id: 'label', top: 100, left: 100, attrs: { text: 'Hello' } },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = redundantPartsRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should not flag IR remotes (wireless)', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-ir-remote', id: 'remote', top: 100, left: 100 },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = redundantPartsRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });
});
