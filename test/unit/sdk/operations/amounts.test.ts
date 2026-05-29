/**
 * Unit tests for src/sdk/operations/amounts.ts — toInt64Long
 *
 * The int64 overflow guard (ADR-0007). Long.fromString silently WRAPS on overflow,
 * so this guard must round-trip-check and throw rather than pass a wrapped value on.
 */

import { describe, it, expect } from 'vitest';
import { toInt64Long } from '../../../../src/sdk/operations/amounts.js';

describe('toInt64Long', () => {
  it('accepts "0" (lower boundary)', () => {
    expect(toInt64Long('0').toString()).toBe('0');
  });

  it('accepts a small value', () => {
    expect(toInt64Long('1000').toString()).toBe('1000');
  });

  it('accepts a value above 2^53 within int64', () => {
    expect(toInt64Long('9007199254740993').toString()).toBe('9007199254740993');
  });

  it('accepts int64-max exactly (9223372036854775807)', () => {
    expect(toInt64Long('9223372036854775807').toString()).toBe('9223372036854775807');
  });

  it('throws on int64-max + 1 (the silent-wrap case)', () => {
    expect(() => toInt64Long('9223372036854775808')).toThrow(/int64/);
  });

  it('throws on uint64-max (wraps to -1)', () => {
    expect(() => toInt64Long('18446744073709551615')).toThrow();
  });

  it('throws on a value far above int64', () => {
    expect(() => toInt64Long('99999999999999999999')).toThrow();
  });

  it('throws on a negative amount', () => {
    expect(() => toInt64Long('-1')).toThrow(/non-negative/);
  });

  it('throws on a leading-zero string (round-trip mismatch)', () => {
    expect(() => toInt64Long('01')).toThrow();
  });
});
