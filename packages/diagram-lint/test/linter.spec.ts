import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { DiagramLinter } from '../src/linter.js';
import type { BoardBundle, Diagram } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): Diagram {
  const path = join(__dirname, 'fixtures', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as Diagram;
}

describe('DiagramLinter', () => {
  it('should validate a valid diagram without errors', () => {
    const linter = new DiagramLinter();
    const diagram = loadFixture('basic-led-blink');
    const result = linter.lint(diagram);

    expect(result.valid).toBe(true);
    expect(result.stats.errors).toBe(0);
  });

  describe('invalid diagrams', () => {
    it('should detect duplicate IDs', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('duplicate-id');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.rule === 'duplicate-id')).toBe(true);
    });

    it('should detect invalid pins', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('invalid-pin');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.rule === 'invalid-pin')).toBe(true);
    });

    it('should detect missing components', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('missing-component');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.rule === 'missing-component')).toBe(true);
    });

    it('should detect unknown part types', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('unknown-part');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.rule === 'unknown-part-type')).toBe(true);
    });

    it('should detect invalid attributes', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('invalid-attr');
      const result = linter.lint(diagram);

      // invalid-attribute is a warning, so valid can still be true
      expect(result.issues.some((i) => i.rule === 'invalid-attribute')).toBe(true);
    });

    it('should detect misplaced coordinates', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('misplaced-coords');
      const result = linter.lint(diagram);

      expect(result.issues.some((i) => i.rule === 'misplaced-coords')).toBe(true);
    });

    it('should detect redundant parts', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('redundant-parts');
      const result = linter.lint(diagram);

      expect(result.issues.some((i) => i.rule === 'redundant-parts')).toBe(true);
    });

    it('should detect wrong coordinate names', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('wrong-coord-names');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.rule === 'wrong-coord-names')).toBe(true);
    });

    it('should detect unsupported parts', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('unsupported-part');
      const result = linter.lint(diagram);

      expect(result.issues.some((i) => i.rule === 'unsupported-part')).toBe(true);
    });

    it('should detect multiple issues in one diagram', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('multiple-issues');
      const result = linter.lint(diagram);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(3);
    });
  });

  describe('lintJSON', () => {
    it('should lint valid JSON', () => {
      const linter = new DiagramLinter();
      const json = JSON.stringify({
        version: 1,
        parts: [{ type: 'wokwi-arduino-uno', id: 'uno', top: 0, left: 0 }],
        connections: [],
        dependencies: {},
      });

      const result = linter.lintJSON(json);
      expect(result.valid).toBe(true);
    });

    it('should report JSON parse errors', () => {
      const linter = new DiagramLinter();
      const result = linter.lintJSON('{ invalid json }');

      expect(result.valid).toBe(false);
      expect(result.issues[0].rule).toBe('json-parse');
    });
  });

  describe('rule configuration', () => {
    it('should allow disabling rules', () => {
      const linter = new DiagramLinter({
        rules: {
          'duplicate-id': false,
        },
      });

      const diagram = loadFixture('duplicate-id');
      const result = linter.lint(diagram);

      expect(result.issues.some((i) => i.rule === 'duplicate-id')).toBe(false);
    });

    it('should allow changing rule severity', () => {
      const linter = new DiagramLinter({
        rules: {
          'invalid-attribute': { severity: 'error' },
        },
      });

      const diagram = loadFixture('invalid-attr');
      const result = linter.lint(diagram);

      const attrIssue = result.issues.find((i) => i.rule === 'invalid-attribute');
      expect(attrIssue?.severity).toBe('error');
    });

    it('should support runtime rule configuration', () => {
      const linter = new DiagramLinter();
      linter.setRuleEnabled('redundant-parts', false);

      const diagram = loadFixture('redundant-parts');
      const result = linter.lint(diagram);

      expect(result.issues.some((i) => i.rule === 'redundant-parts')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should calculate correct stats', () => {
      const linter = new DiagramLinter();
      const diagram = loadFixture('multiple-issues');
      const result = linter.lint(diagram);

      expect(result.stats.total).toBe(result.issues.length);
      expect(result.stats.errors).toBe(result.issues.filter((i) => i.severity === 'error').length);
      expect(result.stats.warnings).toBe(
        result.issues.filter((i) => i.severity === 'warning').length,
      );
      expect(result.stats.infos).toBe(result.issues.filter((i) => i.severity === 'info').length);
    });
  });

  describe('loadBoardsBundle', () => {
    it('should load boards from bundle and validate pins', () => {
      const linter = new DiagramLinter();
      const bundle: BoardBundle = {
        'test-board': {
          rev: '123',
          def: {
            name: 'Test Board',
            pins: {
              GPIO0: { x: 0, y: 0 },
              GPIO1: { x: 1, y: 0 },
              GND: { x: 2, y: 0 },
            },
          },
        },
      };

      const count = linter.getRegistry().loadBoardsBundle(bundle);
      expect(count).toBe(1);

      // Verify pins are now valid
      const diagram: Diagram = {
        version: 1,
        parts: [
          { type: 'board-test-board', id: 'board1', top: 0, left: 0 },
          { type: 'wokwi-led', id: 'led1', top: 100, left: 100 },
        ],
        connections: [['board1:GPIO0', 'led1:A', 'green', []]],
      };

      const result = linter.lint(diagram);
      expect(result.issues.filter((i) => i.rule === 'invalid-pin')).toHaveLength(0);

      // Verify invalid pin is detected
      const badDiagram: Diagram = {
        ...diagram,
        connections: [['board1:INVALID_PIN', 'led1:A', 'green', []]],
      };

      const badResult = linter.lint(badDiagram);
      expect(badResult.issues.some((i) => i.rule === 'invalid-pin')).toBe(true);
    });
  });
});
