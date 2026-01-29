import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { misplacedCoordsRule } from '../../src/rules/misplaced-coords.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('misplaced-coords rule', () => {
  it('should pass when coords are at part level', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', top: 100, left: 200 }],
      connections: [],
      dependencies: {},
    };

    const issues = misplacedCoordsRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect top in attrs', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', attrs: { top: '100' } }],
      connections: [],
      dependencies: {},
    };

    const issues = misplacedCoordsRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.attr).toBe('top');
    expect(issues[0].severity).toBe('warning');
  });

  it('should detect left in attrs', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', attrs: { left: '200' } }],
      connections: [],
      dependencies: {},
    };

    const issues = misplacedCoordsRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.attr).toBe('left');
  });

  it('should detect both top and left in attrs', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', attrs: { top: '100', left: '200' } }],
      connections: [],
      dependencies: {},
    };

    const issues = misplacedCoordsRule.check(createContext(diagram));
    expect(issues).toHaveLength(2);
  });
});
