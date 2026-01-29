import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { invalidAttributeRule } from '../../src/rules/invalid-attribute.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('invalid-attribute rule', () => {
  it('should pass with valid attributes', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'wokwi-led',
          id: 'led1',
          top: 100,
          left: 100,
          attrs: { color: 'red' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect unknown attributes', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'wokwi-led',
          id: 'led1',
          top: 100,
          left: 100,
          attrs: { unknown_attr: 'value' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.attrName).toBe('unknown_attr');
    expect(issues[0].severity).toBe('warning');
  });

  it('should detect invalid attribute values', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'wokwi-rgb-led',
          id: 'rgb1',
          top: 100,
          left: 100,
          attrs: { common: 'invalid_value' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].context?.attrValue).toBe('invalid_value');
  });

  it('should allow valid enum values', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'wokwi-rgb-led',
          id: 'rgb1',
          top: 100,
          left: 100,
          attrs: { common: 'anode' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should skip validation for custom chips', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'chip-custom',
          id: 'chip1',
          top: 100,
          left: 100,
          attrs: { any_attr: 'any_value' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should skip validation for unknown parts', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        {
          type: 'wokwi-unknown',
          id: 'unk1',
          top: 100,
          left: 100,
          attrs: { any_attr: 'any_value' },
        },
      ],
      connections: [],
      dependencies: {},
    };

    const issues = invalidAttributeRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });
});
