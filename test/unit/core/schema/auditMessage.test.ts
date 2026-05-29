import { describe, it, expect } from 'vitest';
import {
  encodeAuditMessage,
  decodeAuditMessage,
  AUDIT_EVENT_TYPES,
} from '../../../../src/core/schema/auditMessage.js';
import type { AuditMessage, AuditEventType } from '../../../../src/core/schema/auditMessage.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validBase(): AuditMessage {
  return {
    v: 1,
    type: 'KYC_GRANTED',
    tokenId: '0.0.123456',
    ts: '2026-05-28T14:32:00Z',
    actor: '0.0.1001',
    subject: '0.0.2002',
  };
}

// ---------------------------------------------------------------------------
// AUDIT_EVENT_TYPES constant
// ---------------------------------------------------------------------------

describe('AUDIT_EVENT_TYPES', () => {
  it('contains all ten expected event type strings', () => {
    const expected = [
      'TOKEN_CREATED',
      'TOPIC_CREATED',
      'KYC_GRANTED',
      'KYC_REVOKED',
      'MINTED',
      'FROZEN',
      'UNFROZEN',
      'WIPED',
      'PAUSED',
      'UNPAUSED',
    ];
    expect(Array.from(AUDIT_EVENT_TYPES)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// encodeAuditMessage — valid inputs
// ---------------------------------------------------------------------------

describe('encodeAuditMessage', () => {
  describe('happy path', () => {
    it('returns valid JSON for a minimal KYC_GRANTED message', () => {
      const encoded = encodeAuditMessage(validBase());
      expect(() => JSON.parse(encoded)).not.toThrow();
    });

    it('round-trips through decodeAuditMessage to status valid', () => {
      const msg = validBase();
      const encoded = encodeAuditMessage(msg);
      const decoded = decodeAuditMessage(encoded);
      expect(decoded.status).toBe('valid');
    });

    it('round-trips to deep-equal original message', () => {
      const msg = validBase();
      const encoded = encodeAuditMessage(msg);
      const decoded = decodeAuditMessage(encoded);
      expect(decoded.status).toBe('valid');
      if (decoded.status === 'valid') {
        expect(decoded.value).toEqual(msg);
      }
    });

    it('accepts TOKEN_CREATED with no subject or amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'TOKEN_CREATED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts TOPIC_CREATED with no subject or amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'TOPIC_CREATED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts PAUSED with no subject or amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'PAUSED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts UNPAUSED with no subject or amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'UNPAUSED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts MINTED with required amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '5000',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts WIPED with required subject and amount', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'WIPED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
        amount: '100',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts FROZEN with required subject', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'FROZEN',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts UNFROZEN with required subject', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'UNFROZEN',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts KYC_REVOKED with required subject', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'KYC_REVOKED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('accepts an optional note within 120 chars', () => {
      const msg: AuditMessage = { ...validBase(), note: 'Q2 onboarding batch' };
      expect(() => encodeAuditMessage(msg)).not.toThrow();
    });

    it('preserves a huge amount string without precision loss (MINTED, 2^53+1)', () => {
      const amount = '9007199254740993';
      const msg: AuditMessage = {
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount,
      };
      const encoded = encodeAuditMessage(msg);
      const decoded = decodeAuditMessage(encoded);
      expect(decoded.status).toBe('valid');
      if (decoded.status === 'valid') {
        expect(decoded.value.amount).toBe(amount);
        expect(typeof decoded.value.amount).toBe('string');
      }
    });

    it('preserves a uint64-max amount string without precision loss (WIPED)', () => {
      const amount = '18446744073709551615';
      const msg: AuditMessage = {
        v: 1,
        type: 'WIPED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
        amount,
      };
      const encoded = encodeAuditMessage(msg);
      const decoded = decodeAuditMessage(encoded);
      expect(decoded.status).toBe('valid');
      if (decoded.status === 'valid') {
        expect(decoded.value.amount).toBe(amount);
        expect(typeof decoded.value.amount).toBe('string');
      }
    });
  });

  describe('invalid inputs — throws', () => {
    it('throws when tokenId does not match shard.realm.num format', () => {
      const msg = { ...validBase(), tokenId: 'not-valid' };
      // Cast to any to test runtime validation beyond what TS catches
      expect(() => encodeAuditMessage(msg as AuditMessage)).toThrow();
    });

    it('throws when actor does not match shard.realm.num format', () => {
      const msg = { ...validBase(), actor: '0x1001' };
      expect(() => encodeAuditMessage(msg as AuditMessage)).toThrow();
    });

    it('throws when subject does not match shard.realm.num format', () => {
      const msg = { ...validBase(), subject: 'abc' };
      expect(() => encodeAuditMessage(msg as AuditMessage)).toThrow();
    });

    it('throws when amount is a number instead of a string', () => {
      const msg = {
        ...validBase(),
        type: 'MINTED' as AuditEventType,
        amount: 1000 as unknown as string,
      };
      expect(() => encodeAuditMessage(msg)).toThrow();
    });

    it('throws when note exceeds 120 characters', () => {
      const msg: AuditMessage = { ...validBase(), note: 'x'.repeat(121) };
      expect(() => encodeAuditMessage(msg)).toThrow();
    });

    it('throws when ts is not a valid ISO-8601 UTC timestamp', () => {
      const msg = { ...validBase(), ts: 'not-a-date' };
      expect(() => encodeAuditMessage(msg as AuditMessage)).toThrow();
    });

    it('throws when amount is a negative string', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '-1',
      };
      expect(() => encodeAuditMessage(msg)).toThrow();
    });

    it('throws when amount is "0" (not positive)', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '0',
      };
      expect(() => encodeAuditMessage(msg)).toThrow();
    });

    it('throws when amount is a decimal string', () => {
      const msg: AuditMessage = {
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '1.5',
      };
      expect(() => encodeAuditMessage(msg)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// decodeAuditMessage — never throws
// ---------------------------------------------------------------------------

describe('decodeAuditMessage', () => {
  describe('valid inputs', () => {
    it('returns status valid for a correct KYC_GRANTED message', () => {
      const msg = validBase();
      const raw = JSON.stringify(msg);
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('valid');
    });

    it('returns the parsed value deeply equal to the original', () => {
      const msg = validBase();
      const raw = JSON.stringify(msg);
      const result = decodeAuditMessage(raw);
      if (result.status === 'valid') {
        expect(result.value).toEqual(msg);
      }
    });

    it('tolerates unknown extra fields (forward-compat) — returns valid', () => {
      const msg = { ...validBase(), unknownFutureField: 'ignored', anotherField: 42 };
      const raw = JSON.stringify(msg);
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('valid');
    });

    it('accepts MINTED with amount', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '500',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('valid');
    });

    it('accepts WIPED with subject and amount', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'WIPED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
        amount: '100',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('valid');
    });

    it('preserves amount > 2^53 as the exact string — never a number', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'MINTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        amount: '9007199254740993',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('valid');
      if (result.status === 'valid') {
        expect(result.value.amount).toBe('9007199254740993');
        expect(typeof result.value.amount).toBe('string');
      }
    });
  });

  describe('malformed inputs', () => {
    it('returns malformed for invalid JSON', () => {
      const result = decodeAuditMessage('{ not valid json ]');
      expect(result.status).toBe('malformed');
    });

    it('returns malformed for a JSON string (not an object)', () => {
      const result = decodeAuditMessage('"just a string"');
      expect(result.status).toBe('malformed');
    });

    it('returns malformed for a JSON array', () => {
      const result = decodeAuditMessage('[1,2,3]');
      expect(result.status).toBe('malformed');
    });

    it('returns malformed for an empty string', () => {
      const result = decodeAuditMessage('');
      expect(result.status).toBe('malformed');
    });

    it('returns malformed when v field is missing', () => {
      const raw = JSON.stringify({
        type: 'KYC_GRANTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('malformed');
    });

    it('returns malformed when tokenId is missing', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'KYC_GRANTED',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('malformed');
    });

    it('returns malformed when actor is missing', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'KYC_GRANTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('malformed');
    });

    it('returns malformed when ts is missing', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'KYC_GRANTED',
        tokenId: '0.0.1',
        actor: '0.0.1001',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('malformed');
    });

    it('returns malformed when tokenId fails the account-id pattern', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'KYC_GRANTED',
        tokenId: 'bad-id',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('malformed');
    });

    it('never throws for any input', () => {
      const badInputs = ['{ not valid json }', '', 'null', 'undefined', '[]', '{}', 'true', '1234'];
      for (const input of badInputs) {
        expect(() => decodeAuditMessage(input)).not.toThrow();
      }
    });
  });

  describe('unrecognized inputs (forward-compat)', () => {
    it('returns unrecognized when type is a future unknown event type', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'FUTURE_EVENT_TYPE',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('unrecognized');
    });

    it('returns unrecognized when v is 2 (future schema version)', () => {
      const raw = JSON.stringify({
        v: 2,
        type: 'KYC_GRANTED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
        subject: '0.0.2002',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('unrecognized');
    });

    it('returns unrecognized (not malformed) for unknown type — so the feed does not error', () => {
      const raw = JSON.stringify({
        v: 1,
        type: 'COMPLIANCE_VERIFIED',
        tokenId: '0.0.1',
        ts: '2026-01-01T00:00:00Z',
        actor: '0.0.1001',
      });
      const result = decodeAuditMessage(raw);
      expect(result.status).toBe('unrecognized');
      expect(result.status).not.toBe('malformed');
    });
  });
});
