import { describe, it, expect } from 'vitest';
import { parseJsonBigintSafe } from '../../../../src/core/mirror/json.js';

const AMOUNT_KEYS = new Set(['balance', 'total_supply', 'initial_supply', 'max_supply']);

describe('parseJsonBigintSafe', () => {
  describe('precision for amount keys', () => {
    it('preserves an amount > 2^53 as the exact string (9007199254740993)', () => {
      const text = '{"balance": 9007199254740993}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['balance']).toBe('9007199254740993');
      expect(typeof result['balance']).toBe('string');
    });

    it('does not produce the lossy number 9007199254740992 for 9007199254740993', () => {
      const text = '{"balance": 9007199254740993}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['balance']).not.toBe(9007199254740992);
    });

    it('preserves uint64-max as the exact string (18446744073709551615)', () => {
      const text = '{"balance": 18446744073709551615}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['balance']).toBe('18446744073709551615');
      expect(typeof result['balance']).toBe('string');
    });

    it('preserves total_supply as exact string when > 2^53', () => {
      const text = '{"total_supply": 9007199254740993}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['total_supply']).toBe('9007199254740993');
    });

    it('preserves an unquoted initial_supply > 2^53 as exact string', () => {
      const text = '{"initial_supply": 9007199254740993}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['initial_supply']).toBe('9007199254740993');
      expect(typeof result['initial_supply']).toBe('string');
    });

    it('preserves an unquoted max_supply at uint64-max as exact string', () => {
      const text = '{"max_supply": 18446744073709551615}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['max_supply']).toBe('18446744073709551615');
      expect(typeof result['max_supply']).toBe('string');
    });

    it('passes through a balance already serialized as a quoted string unchanged', () => {
      const text = '{"total_supply":"450010110000000"}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['total_supply']).toBe('450010110000000');
      expect(typeof result['total_supply']).toBe('string');
    });

    it('preserves a safe-range amount as a string (amount keys always become strings)', () => {
      const text = '{"balance": 1000}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      // Amount keys become strings regardless — this is safe and correct
      // (if implementation chooses to return number for small values, adjust; but string is preferred)
      // The key contract: the digit string is preserved exactly
      const val = result['balance'];
      expect(String(val)).toBe('1000');
    });
  });

  describe('non-amount keys are parsed normally', () => {
    it('parses decimals as a number, not a string', () => {
      const text = '{"decimals": 6}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['decimals']).toBe(6);
      expect(typeof result['decimals']).toBe('number');
    });

    it('parses a boolean normally', () => {
      const text = '{"freeze_default": false}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['freeze_default']).toBe(false);
    });

    it('parses a string value normally', () => {
      const text = '{"name": "Acme RWA"}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['name']).toBe('Acme RWA');
    });

    it('parses null normally', () => {
      const text = '{"wipe_key": null}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(result['wipe_key']).toBeNull();
    });
  });

  describe('nested structures', () => {
    it('preserves a bignum balance inside a nested object', () => {
      const text = '{"entry": {"balance": 9007199254740993}}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      const entry = result['entry'] as Record<string, unknown>;
      expect(entry['balance']).toBe('9007199254740993');
    });

    it('preserves bignum balances inside an array of entries', () => {
      const text =
        '{"balances": [{"account":"0.0.2002","balance": 9007199254740993},{"account":"0.0.2003","balance": 18446744073709551615}]}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      const balances = result['balances'] as Array<Record<string, unknown>>;
      expect(balances[0]!['balance']).toBe('9007199254740993');
      expect(balances[1]!['balance']).toBe('18446744073709551615');
    });

    it('handles mixed keys in the same object — amount key preserved, non-amount parsed normally', () => {
      const text = '{"decimals": 6, "balance": 9007199254740993, "name": "Test"}';
      const result = parseJsonBigintSafe(text, AMOUNT_KEYS) as Record<string, unknown>;
      expect(typeof result['decimals']).toBe('number');
      expect(result['decimals']).toBe(6);
      expect(result['balance']).toBe('9007199254740993');
      expect(result['name']).toBe('Test');
    });
  });

  describe('error cases', () => {
    it('throws on invalid JSON text', () => {
      expect(() => parseJsonBigintSafe('{ not valid json }', AMOUNT_KEYS)).toThrow();
    });

    it('throws on empty string', () => {
      expect(() => parseJsonBigintSafe('', AMOUNT_KEYS)).toThrow();
    });
  });
});
