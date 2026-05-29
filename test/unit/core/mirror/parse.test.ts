import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseTokenInfo,
  parseAccountTokens,
  parseTokenBalances,
  parseTopicMessages,
} from '../../../../src/core/mirror/parse.js';

// Local minimal type for balance entries — mirrors TokenBalanceEntry from
// src/core/mirror/types.ts (defined here so the test file is self-contained
// and type-correct even before the source modules exist).
type BalanceEntry = { account: string; balance: string };

// ---------------------------------------------------------------------------
// Fixture loader — reads as TEXT to avoid JSON.parse precision loss
// ---------------------------------------------------------------------------

function fixture(relPath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../fixtures/mirror/${relPath}`, import.meta.url)),
    'utf8',
  );
}

// ---------------------------------------------------------------------------
// parseTokenInfo
// ---------------------------------------------------------------------------

describe('parseTokenInfo', () => {
  it('returns status valid for a well-formed token-info response', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    expect(result.status).toBe('valid');
  });

  it('maps snake_case wire fields to camelCase domain fields', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value.tokenId).toBe('0.0.123456');
      expect(result.value.treasuryAccountId).toBe('0.0.1001');
      expect(result.value.totalSupply).toBeDefined();
      expect(result.value.pauseStatus).toBeDefined();
    }
  });

  it('returns tokenId as a string', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    if (result.status === 'valid') {
      expect(typeof result.value.tokenId).toBe('string');
    }
  });

  it('returns totalSupply as a string (not a number)', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    if (result.status === 'valid') {
      expect(typeof result.value.totalSupply).toBe('string');
    }
  });

  it('returns decimals as a number', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    if (result.status === 'valid') {
      expect(typeof result.value.decimals).toBe('number');
      expect(result.value.decimals).toBe(2);
    }
  });

  it('maps correct field values from fixture', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    if (result.status === 'valid') {
      expect(result.value.name).toBe('Acme RWA');
      expect(result.value.symbol).toBe('ARWA');
      expect(result.value.type).toBe('FUNGIBLE_COMMON');
      expect(result.value.pauseStatus).toBe('UNPAUSED');
      expect(result.value.treasuryAccountId).toBe('0.0.1001');
    }
  });

  it('parses all token keys as {_type, key} objects when present', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    if (result.status === 'valid') {
      expect(result.value.adminKey).not.toBeNull();
      expect(result.value.adminKey!._type).toBe('ED25519');
      expect(result.value.kycKey).not.toBeNull();
      expect(result.value.freezeKey).not.toBeNull();
      expect(result.value.wipeKey).not.toBeNull();
      expect(result.value.pauseKey).not.toBeNull();
      expect(result.value.supplyKey).not.toBeNull();
    }
  });

  it('handles null keys (wipe_key, pause_key) gracefully', () => {
    const result = parseTokenInfo(fixture('token-info-null-keys.json'));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value.wipeKey).toBeNull();
      expect(result.value.pauseKey).toBeNull();
      // non-null keys still parsed
      expect(result.value.adminKey).not.toBeNull();
    }
  });

  it('tolerates and ignores unknown extra wire fields', () => {
    const result = parseTokenInfo(fixture('token-info.json'));
    // fixture has extra_unknown_field — should still be valid
    expect(result.status).toBe('valid');
  });

  it('returns malformed for invalid JSON text', () => {
    const result = parseTokenInfo('{ not valid json }');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed for an empty string', () => {
    const result = parseTokenInfo('');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when required fields are missing', () => {
    const result = parseTokenInfo('{"name":"Test"}');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when tokenId has wrong type', () => {
    const result = parseTokenInfo(
      '{"token_id": 123456, "name":"x","symbol":"X","decimals":"0","total_supply":"0","treasury_account_id":"0.0.1","type":"FUNGIBLE_COMMON","pause_status":"UNPAUSED"}',
    );
    expect(result.status).toBe('malformed');
  });

  it('never throws', () => {
    const badInputs = ['', '{', 'null', '[]', '{"wrong":true}'];
    for (const input of badInputs) {
      expect(() => parseTokenInfo(input)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// parseAccountTokens
// ---------------------------------------------------------------------------

describe('parseAccountTokens', () => {
  it('returns status valid for a KYC GRANTED / UNFROZEN fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-granted.json'));
    expect(result.status).toBe('valid');
  });

  it('returns an array with one entry for the granted fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-granted.json'));
    if (result.status === 'valid') {
      expect(result.value).toHaveLength(1);
    }
  });

  it('maps wire fields to camelCase domain fields', () => {
    const result = parseAccountTokens(fixture('account-tokens-granted.json'));
    if (result.status === 'valid') {
      const entry = result.value[0]!;
      expect(entry.tokenId).toBe('0.0.123456');
      expect(entry.kycStatus).toBe('GRANTED');
      expect(entry.freezeStatus).toBe('UNFROZEN');
      expect(entry.automaticAssociation).toBe(true);
    }
  });

  it('returns balance as a string, not a number', () => {
    const result = parseAccountTokens(fixture('account-tokens-granted.json'));
    if (result.status === 'valid') {
      expect(typeof result.value[0]!.balance).toBe('string');
    }
  });

  it('returns kycStatus REVOKED for the revoked fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-revoked.json'));
    if (result.status === 'valid') {
      expect(result.value[0]!.kycStatus).toBe('REVOKED');
    }
  });

  it('returns freezeStatus FROZEN for the frozen fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-frozen.json'));
    if (result.status === 'valid') {
      expect(result.value[0]!.freezeStatus).toBe('FROZEN');
    }
  });

  it('returns NOT_APPLICABLE statuses for the not-applicable fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-not-applicable.json'));
    if (result.status === 'valid') {
      expect(result.value[0]!.kycStatus).toBe('NOT_APPLICABLE');
      expect(result.value[0]!.freezeStatus).toBe('NOT_APPLICABLE');
    }
  });

  it('returns a valid empty array for an empty tokens fixture', () => {
    const result = parseAccountTokens(fixture('account-tokens-empty.json'));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value).toEqual([]);
    }
  });

  it('returns malformed for invalid JSON', () => {
    const result = parseAccountTokens('not json');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when tokens array is missing from body', () => {
    const result = parseAccountTokens('{"balances":[]}');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when tokens is not an array', () => {
    const result = parseAccountTokens('{"tokens": "wrong"}');
    expect(result.status).toBe('malformed');
  });

  it('never throws', () => {
    const badInputs = ['', '{', 'null', '[]'];
    for (const input of badInputs) {
      expect(() => parseAccountTokens(input)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// parseTokenBalances
// ---------------------------------------------------------------------------

describe('parseTokenBalances', () => {
  it('returns status valid for the bignum balances fixture', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    expect(result.status).toBe('valid');
  });

  it('returns three balance entries from the bignum fixture', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    if (result.status === 'valid') {
      expect(result.value.balances).toHaveLength(3);
    }
  });

  it('preserves balance > 2^53 as the exact digit string (9007199254740993)', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    if (result.status === 'valid') {
      const balances = result.value.balances as BalanceEntry[];
      const entry = balances.find((b: BalanceEntry) => b.account === '0.0.2002');
      expect(entry).toBeDefined();
      expect(entry!.balance).toBe('9007199254740993');
      expect(typeof entry!.balance).toBe('string');
    }
  });

  it('preserves uint64-max balance as the exact digit string (18446744073709551615)', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    if (result.status === 'valid') {
      const balances = result.value.balances as BalanceEntry[];
      const entry = balances.find((b: BalanceEntry) => b.account === '0.0.2003');
      expect(entry).toBeDefined();
      expect(entry!.balance).toBe('18446744073709551615');
      expect(typeof entry!.balance).toBe('string');
    }
  });

  it('returns a safe-range balance as a string too', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    if (result.status === 'valid') {
      const balances = result.value.balances as BalanceEntry[];
      const entry = balances.find((b: BalanceEntry) => b.account === '0.0.2004');
      expect(entry).toBeDefined();
      expect(typeof entry!.balance).toBe('string');
    }
  });

  it('returns a valid timestamp from the fixture', () => {
    const result = parseTokenBalances(fixture('balances-bignum.json'));
    if (result.status === 'valid') {
      expect(result.value.timestamp).toBe('1700000000.000000000');
    }
  });

  it('returns valid empty balances array for the empty fixture', () => {
    const result = parseTokenBalances(fixture('balances-empty.json'));
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value.balances).toEqual([]);
    }
  });

  it('handles null timestamp gracefully', () => {
    const text = JSON.stringify({ timestamp: null, balances: [] });
    const result = parseTokenBalances(text);
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value.timestamp).toBeNull();
    }
  });

  it('returns malformed for invalid JSON', () => {
    const result = parseTokenBalances('not json');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when balances field is missing', () => {
    const result = parseTokenBalances('{"timestamp":"1700000000.000000000"}');
    expect(result.status).toBe('malformed');
  });

  it('never throws', () => {
    const badInputs = ['', '{', 'null', 'true'];
    for (const input of badInputs) {
      expect(() => parseTokenBalances(input)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// parseTopicMessages
// ---------------------------------------------------------------------------

// Helper: build base64 of a UTF-8 string
function toBase64(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}

// The three audit payloads for the multi-variant fixture
const VALID_AUDIT_JSON = JSON.stringify({
  v: 1,
  type: 'KYC_GRANTED',
  tokenId: '0.0.123456',
  ts: '2026-05-28T14:32:00Z',
  actor: '0.0.1001',
  subject: '0.0.2002',
});

const MALFORMED_AUDIT_JSON = 'definitely { not [ valid json';

const UNRECOGNIZED_AUDIT_JSON = JSON.stringify({
  v: 1,
  type: 'FUTURE_EVENT_TYPE_V99',
  tokenId: '0.0.123456',
  ts: '2026-05-28T14:32:00Z',
  actor: '0.0.1001',
});

function buildTopicMessagesText(overrides?: { messages?: unknown[] }): string {
  const messages = overrides?.messages ?? [
    {
      consensus_timestamp: '1700000000.000000001',
      topic_id: '0.0.7007',
      message: toBase64(VALID_AUDIT_JSON),
      payer_account_id: '0.0.1001',
      sequence_number: 1,
      running_hash: 'aabbccdd',
      running_hash_version: 3,
    },
    {
      consensus_timestamp: '1700000000.000000002',
      topic_id: '0.0.7007',
      message: toBase64(MALFORMED_AUDIT_JSON),
      payer_account_id: '0.0.1001',
      sequence_number: 2,
      running_hash: 'eeff0011',
      running_hash_version: 3,
    },
    {
      consensus_timestamp: '1700000000.000000003',
      topic_id: '0.0.7007',
      message: toBase64(UNRECOGNIZED_AUDIT_JSON),
      payer_account_id: '0.0.1001',
      sequence_number: 3,
      running_hash: '22334455',
      running_hash_version: 3,
    },
  ];
  return JSON.stringify({ messages, links: { next: null } });
}

describe('parseTopicMessages', () => {
  it('returns status valid for a well-formed three-message feed', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    expect(result.status).toBe('valid');
  });

  it('returns three parsed entries', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value).toHaveLength(3);
    }
  });

  it('first entry has audit.status valid for the correct audit JSON', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[0]!.audit.status).toBe('valid');
    }
  });

  it('second entry has audit.status malformed for the invalid audit JSON', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[1]!.audit.status).toBe('malformed');
    }
  });

  it('third entry has audit.status unrecognized for the unknown type', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[2]!.audit.status).toBe('unrecognized');
    }
  });

  it('top-level result is still valid even when some audit entries are malformed/unrecognized', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    expect(result.status).toBe('valid');
    expect(result.status).not.toBe('malformed');
  });

  it('preserves consensusTimestamp from the wire field', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[0]!.consensusTimestamp).toBe('1700000000.000000001');
    }
  });

  it('preserves sequenceNumber from the wire field', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[0]!.sequenceNumber).toBe(1);
      expect(result.value[1]!.sequenceNumber).toBe(2);
      expect(result.value[2]!.sequenceNumber).toBe(3);
    }
  });

  it('preserves payerAccountId from the wire field', () => {
    const result = parseTopicMessages(buildTopicMessagesText());
    if (result.status === 'valid') {
      expect(result.value[0]!.payerAccountId).toBe('0.0.1001');
    }
  });

  it('returns valid with empty array for an empty messages feed', () => {
    const text = JSON.stringify({ messages: [], links: { next: null } });
    const result = parseTopicMessages(text);
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.value).toEqual([]);
    }
  });

  it('returns malformed for invalid JSON text', () => {
    const result = parseTopicMessages('not json');
    expect(result.status).toBe('malformed');
  });

  it('returns malformed when messages field is missing', () => {
    const result = parseTopicMessages('{"links":{"next":null}}');
    expect(result.status).toBe('malformed');
  });

  it('never throws', () => {
    const badInputs = ['', '{', 'null', '[]'];
    for (const input of badInputs) {
      expect(() => parseTopicMessages(input)).not.toThrow();
    }
  });
});
