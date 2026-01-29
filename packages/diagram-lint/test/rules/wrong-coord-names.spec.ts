import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { wrongCoordNamesRule } from '../../src/rules/wrong-coord-names.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('wrong-coord-names rule', () => {
  it('should pass with correct coord names', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', top: 100, left: 200 }],
      connections: [],
      dependencies: {},
    };

    const issues = wrongCoordNamesRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect x instead of left', () => {
    const diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', x: 200 }],
      connections: [],
      dependencies: {},
    } as unknown as Diagram;

    const issues = wrongCoordNamesRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.wrongProp).toBe('x');
    expect(issues[0].context?.correctProp).toBe('left');
    expect(issues[0].severity).toBe('error');
  });

  it('should detect y instead of top', () => {
    const diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', y: 100 }],
      connections: [],
      dependencies: {},
    } as unknown as Diagram;

    const issues = wrongCoordNamesRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.wrongProp).toBe('y');
    expect(issues[0].context?.correctProp).toBe('top');
  });

  it('should detect both x and y', () => {
    const diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', x: 200, y: 100 }],
      connections: [],
      dependencies: {},
    } as unknown as Diagram;

    const issues = wrongCoordNamesRule.check(createContext(diagram));
    expect(issues).toHaveLength(2);
  });

  it('should detect x/y in attrs', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [{ type: 'wokwi-led', id: 'led1', attrs: { x: '200', y: '100' } }],
      connections: [],
      dependencies: {},
    };

    const issues = wrongCoordNamesRule.check(createContext(diagram));
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.context?.inAttrs === true)).toBe(true);
  });
});
