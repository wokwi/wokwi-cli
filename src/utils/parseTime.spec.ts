import { describe, expect, test } from 'vitest';
import { parseTime } from './parseTime';

describe('parseTime', () => {
  test('parses nanoseconds', () => {
    expect(parseTime('1ns')).toBe(1);
    expect(parseTime('1.0ns')).toBe(1);
    expect(parseTime('1.5ns')).toBe(1.5);
  });

  test('parses microseconds', () => {
    expect(parseTime('1us')).toBe(1_000);
    expect(parseTime('1.0us')).toBe(1_000);
    expect(parseTime('1.5us')).toBe(1_500);
  });

  test('parses milliseconds', () => {
    expect(parseTime('1ms')).toBe(1_000_000);
    expect(parseTime('100.ms')).toBe(100_000_000);
    expect(parseTime('1.5ms')).toBe(1_500_000);
  });

  test('parses seconds', () => {
    expect(parseTime('1s')).toBe(1_000_000_000);
    expect(parseTime('1.0s')).toBe(1_000_000_000);
    expect(parseTime('1.5s')).toBe(1_500_000_000);
  });

  test('parses with spaces between the value and the unit', () => {
    expect(parseTime('1 ns')).toBe(1);
    expect(parseTime('1.0 ns')).toBe(1);
    expect(parseTime('1.5 ns')).toBe(1.5);
  });

  test('parses with no number following the decimal dot', () => {
    expect(parseTime('1. us')).toBe(1_000);
  });

  test('parses zero', () => {
    expect(parseTime('0')).toBe(0);
    expect(parseTime('0.0')).toBe(0);
    expect(parseTime('0.000')).toBe(0);
  });

  test('parses zero with units', () => {
    expect(parseTime('0ns')).toBe(0);
    expect(parseTime('0us')).toBe(0);
    expect(parseTime('0ms')).toBe(0);
    expect(parseTime('0s')).toBe(0);
    expect(parseTime('0.000ns')).toBe(0);
    expect(parseTime('0.000us')).toBe(0);
    expect(parseTime('0.000ms')).toBe(0);
    expect(parseTime('0.000s')).toBe(0);
  });

  test('throws when units are missing', () => {
    expect(() => parseTime('15.2')).toThrow('Missing units: 15.2');
  });

  test('throws on invalid input', () => {
    expect(() => parseTime('foo')).toThrow('Invalid time: foo');
  });
});
