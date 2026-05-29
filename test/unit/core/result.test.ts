import { describe, it, expect } from 'vitest';
import { ok, malformed, unrecognized } from '../../../src/core/result.js';
import type { Ok, Malformed, Unrecognized } from '../../../src/core/result.js';

describe('ok', () => {
  it('returns a Result with status valid and the given value', () => {
    const result = ok(42);
    expect(result.status).toBe('valid');
    expect((result as Ok<number>).value).toBe(42);
  });

  it('works with object values', () => {
    const value = { tokenId: '0.0.123', amount: '1000' };
    const result = ok(value);
    expect(result.status).toBe('valid');
    expect((result as Ok<typeof value>).value).toEqual(value);
  });

  it('works with null values', () => {
    const result = ok(null);
    expect(result.status).toBe('valid');
    expect((result as Ok<null>).value).toBeNull();
  });
});

describe('malformed', () => {
  it('returns a Result with status malformed and error/raw fields', () => {
    const result = malformed('bad json', '{ not valid }');
    expect(result.status).toBe('malformed');
    expect((result as Malformed).error).toBe('bad json');
    expect((result as Malformed).raw).toBe('{ not valid }');
  });

  it('preserves the raw string exactly', () => {
    const raw = '{"v":99,"type":"UNKNOWN"}';
    const result = malformed('version mismatch', raw);
    expect((result as Malformed).raw).toBe(raw);
  });
});

describe('unrecognized', () => {
  it('returns a result with status unrecognized and the raw value', () => {
    const raw = { v: 2, type: 'FUTURE_EVENT' };
    const result = unrecognized(raw);
    expect(result.status).toBe('unrecognized');
    expect((result as Unrecognized).raw).toEqual(raw);
  });

  it('works with non-object raw values', () => {
    const result = unrecognized('some string');
    expect(result.status).toBe('unrecognized');
    expect((result as Unrecognized).raw).toBe('some string');
  });
});
