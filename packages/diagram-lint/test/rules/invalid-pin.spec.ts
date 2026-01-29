import { describe, expect, it } from 'vitest';
import { PartRegistry } from '../../src/registry/part-registry.js';
import { invalidPinRule } from '../../src/rules/invalid-pin.js';
import type { Diagram } from '../../src/types.js';

function createContext(diagram: Diagram) {
  return {
    diagram,
    registry: new PartRegistry(),
  };
}

describe('invalid-pin rule', () => {
  it('should pass with valid pins', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
      ],
      connections: [
        ['uno:13', 'led1:A', 'green', []],
        ['led1:C', 'uno:GND.1', 'black', []],
      ],
      dependencies: {},
    };

    const issues = invalidPinRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should detect invalid source pin', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
      ],
      connections: [['uno:INVALID', 'led1:A', 'green', []]],
      dependencies: {},
    };

    const issues = invalidPinRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe('uno');
    expect(issues[0].context?.pin).toBe('INVALID');
  });

  it('should detect invalid target pin', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
      ],
      connections: [['uno:13', 'led1:ANODE', 'green', []]],
      dependencies: {},
    };

    const issues = invalidPinRule.check(createContext(diagram));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe('led1');
    expect(issues[0].context?.pin).toBe('ANODE');
  });

  it('should allow explicit numbered pin variants for boards', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-pi-pico', id: 'pico', top: 0, left: 0 },
        { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
        { type: 'wokwi-led', id: 'led2', top: 100, left: 200 },
      ],
      connections: [
        ['pico:GND.1', 'led1:C', 'black', []],
        ['pico:GND.2', 'led2:C', 'black', []],
      ],
      dependencies: {},
    };

    const issues = invalidPinRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  it('should skip validation for custom chips', () => {
    const diagram: Diagram = {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
        { type: 'chip-my-custom', id: 'chip1', top: 100, left: 100 },
      ],
      connections: [['uno:13', 'chip1:ANY_PIN', 'green', []]],
      dependencies: {},
    };

    const issues = invalidPinRule.check(createContext(diagram));
    expect(issues).toHaveLength(0);
  });

  describe('breadboard pins', () => {
    it('should allow valid breadboard row pins', () => {
      const diagram: Diagram = {
        version: 1,
        parts: [
          { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
          { type: 'wokwi-breadboard', id: 'bb1', top: 100, left: 100 },
        ],
        connections: [
          ['uno:13', 'bb1:5t.a', 'green', []],
          ['uno:GND.1', 'bb1:12b.j', 'black', []],
          ['bb1:1t.e', 'bb1:63b.f', 'red', []],
        ],
        dependencies: {},
      };

      const issues = invalidPinRule.check(createContext(diagram));
      expect(issues).toHaveLength(0);
    });

    it('should allow valid breadboard power rail pins', () => {
      const diagram: Diagram = {
        version: 1,
        parts: [
          { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
          { type: 'wokwi-breadboard', id: 'bb1', top: 100, left: 100 },
        ],
        connections: [
          ['uno:5V', 'bb1:tp.1', 'red', []],
          ['uno:GND.1', 'bb1:tn.50', 'black', []],
          ['bb1:bp.25', 'bb1:bn.25', 'blue', []],
        ],
        dependencies: {},
      };

      const issues = invalidPinRule.check(createContext(diagram));
      expect(issues).toHaveLength(0);
    });

    it('should detect invalid breadboard pins', () => {
      const diagram: Diagram = {
        version: 1,
        parts: [
          { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
          { type: 'wokwi-breadboard', id: 'bb1', top: 100, left: 100 },
        ],
        connections: [
          ['uno:13', 'bb1:invalid', 'green', []],
          ['bb1:0t.a', 'uno:GND.1', 'black', []], // 0 is not valid (1-63)
          ['bb1:64t.a', 'uno:5V', 'red', []], // 64 is not valid (1-63)
          ['bb1:tp.0', 'bb1:tn.51', 'blue', []], // 0 and 51 not valid (1-50)
        ],
        dependencies: {},
      };

      const issues = invalidPinRule.check(createContext(diagram));
      expect(issues.length).toBeGreaterThanOrEqual(4);
      expect(issues.every((i) => i.message.includes('Invalid breadboard pin'))).toBe(true);
    });

    it('should work with breadboard-half and breadboard-mini', () => {
      const diagram: Diagram = {
        version: 1,
        parts: [
          { type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 },
          { type: 'wokwi-breadboard-half', id: 'bb1', top: 100, left: 100 },
          { type: 'wokwi-breadboard-mini', id: 'bb2', top: 200, left: 200 },
        ],
        connections: [
          ['uno:13', 'bb1:5t.a', 'green', []],
          ['uno:GND.1', 'bb2:12b.j', 'black', []],
        ],
        dependencies: {},
      };

      const issues = invalidPinRule.check(createContext(diagram));
      expect(issues).toHaveLength(0);
    });
  });
});
