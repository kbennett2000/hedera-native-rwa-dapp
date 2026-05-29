import { describe, it, expect } from 'vitest';
import { formatAmount, formatConsensusTimestamp } from './format';

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------

describe('formatAmount', () => {
  it('converts base units to decimal string with correct fractional digits', () => {
    expect(formatAmount('123456', 2)).toBe('1234.56');
  });

  it('formats 100 base units with 2 decimals as "1.00"', () => {
    expect(formatAmount('100', 2)).toBe('1.00');
  });

  it('left-pads the fractional part when the value is smaller than one unit', () => {
    expect(formatAmount('5', 2)).toBe('0.05');
  });

  it('formats zero base units as "0.00" with 2 decimals', () => {
    expect(formatAmount('0', 2)).toBe('0.00');
  });

  it('returns an integer string with no decimal point when decimals is 0', () => {
    expect(formatAmount('1000', 0)).toBe('1000');
  });

  it('preserves a value larger than Number.MAX_SAFE_INTEGER exactly (proves BigInt, not Number)', () => {
    expect(formatAmount('9007199254740993', 0)).toBe('9007199254740993');
  });

  it('correctly shifts the decimal for a value larger than Number.MAX_SAFE_INTEGER', () => {
    expect(formatAmount('9007199254740993', 2)).toBe('90071992547409.93');
  });

  it('does not add thousands separators', () => {
    // 1_000_000 base units with 0 decimals — must be plain digits, no commas
    expect(formatAmount('1000000', 0)).toBe('1000000');
  });
});

// ---------------------------------------------------------------------------
// formatConsensusTimestamp
// ---------------------------------------------------------------------------

describe('formatConsensusTimestamp', () => {
  it('returns the UTC ISO string for the seconds portion of a consensus timestamp', () => {
    const seconds = 1700000000;
    const expected = new Date(seconds * 1000).toISOString();
    expect(formatConsensusTimestamp('1700000000.000000001')).toBe(expected);
  });

  it('returns the input unchanged for an empty string', () => {
    expect(formatConsensusTimestamp('')).toBe('');
  });

  it('returns the input unchanged for a garbage string', () => {
    expect(formatConsensusTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
  });
});
