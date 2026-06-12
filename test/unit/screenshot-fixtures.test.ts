/**
 * Guards the screenshot-capture fixtures (frontend/scripts/fixtures/) against
 * schema drift. The README screenshots are captured from simulated Mirror Node
 * responses (ADR-0010, amended); these tests run each fixture through the same
 * core parsers the app applies on read, so a parser or audit-schema change
 * breaks the build here rather than silently rendering an error state in a
 * future capture.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseTokenInfo, parseAccountTokens, parseTopicMessages } from '../../src/core/mirror/parse.js';
import { encodeAuditMessage } from '../../src/core/schema/auditMessage.js';
import type { AuditMessage } from '../../src/core/schema/auditMessage.js';

const TOKEN_ID = '0.0.5821234';

// Read as TEXT (bigint-safe parsing happens inside the parsers).
function fixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../frontend/scripts/fixtures/${name}`, import.meta.url)),
    'utf8',
  );
}

describe('screenshot fixture: token-info.json', () => {
  const result = parseTokenInfo(fixture('token-info.json'));

  it('parses as a valid token-info response', () => {
    expect(result.status).toBe('valid');
  });

  it('matches the ids and display values the capture relies on', () => {
    if (result.status !== 'valid') return;
    expect(result.value.tokenId).toBe(TOKEN_ID);
    expect(result.value.name).toBe('Acme RWA');
    expect(result.value.symbol).toBe('ARWA');
    expect(result.value.decimals).toBe(2);
    expect(result.value.totalSupply).toBe('2500000');
    expect(result.value.pauseStatus).toBe('UNPAUSED');
  });

  it('has all six compliance keys set (panel shows every key badge)', () => {
    if (result.status !== 'valid') return;
    expect(result.value.adminKey).not.toBeNull();
    expect(result.value.kycKey).not.toBeNull();
    expect(result.value.freezeKey).not.toBeNull();
    expect(result.value.wipeKey).not.toBeNull();
    expect(result.value.pauseKey).not.toBeNull();
    expect(result.value.supplyKey).not.toBeNull();
  });
});

describe('screenshot fixture: account-tokens-empty.json', () => {
  const result = parseAccountTokens(fixture('account-tokens-empty.json'));

  it('parses as a valid, empty relationship list (pre-association state)', () => {
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.value).toEqual([]);
  });
});

describe('screenshot fixture: account-tokens-associated.json', () => {
  const result = parseAccountTokens(fixture('account-tokens-associated.json'));

  it('parses as a valid account-tokens response', () => {
    expect(result.status).toBe('valid');
  });

  it('shows the just-associated, pre-KYC state for the demo token', () => {
    if (result.status !== 'valid') return;
    expect(result.value).toHaveLength(1);
    const rel = result.value[0]!;
    expect(rel.tokenId).toBe(TOKEN_ID);
    expect(rel.balance).toBe('0');
    expect(rel.kycStatus).toBe('REVOKED');
    expect(rel.freezeStatus).toBe('UNFROZEN');
  });
});

describe('screenshot fixture: topic-messages.json', () => {
  type PayloadEntry = {
    consensus_timestamp: string;
    sequence_number: number;
    payer_account_id: string;
    payload: AuditMessage;
  };
  const raw = JSON.parse(fixture('topic-messages.json')) as { messages: PayloadEntry[] };

  it('every payload is a schema-valid audit message for the demo token', () => {
    for (const { payload } of raw.messages) {
      // encodeAuditMessage throws on anything invalid, including the
      // subject/amount conditional requirements.
      expect(() => encodeAuditMessage(payload)).not.toThrow();
      expect(payload.tokenId).toBe(TOKEN_ID);
    }
  });

  it('parses end-to-end through the wire envelope screenshots.mjs serves', () => {
    // Build the wire body exactly as frontend/scripts/screenshots.mjs does.
    const wire = JSON.stringify({
      ...raw,
      messages: raw.messages.map(({ payload, ...rest }) => ({
        ...rest,
        message: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
      })),
    });
    const result = parseTopicMessages(wire);
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;

    expect(result.value).toHaveLength(raw.messages.length);
    for (const entry of result.value) {
      expect(entry.audit.status).toBe('valid');
    }
    expect(result.value.map((m) => m.sequenceNumber)).toEqual(
      result.value.map((_, i) => i + 1),
    );
    const stamps = result.value.map((m) => m.consensusTimestamp);
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i]! > stamps[i - 1]!).toBe(true);
    }
  });
});
