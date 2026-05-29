import { describe, it, expect } from 'vitest';
import { parseTopicMessages } from '@core';
import type { ParsedTopicMessage } from '@core';
import { sortFeedNewestFirst, toAuditRow } from './audit';

// ---------------------------------------------------------------------------
// Helpers — build wire JSON for parseTopicMessages
// ---------------------------------------------------------------------------

function toBase64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

function toBase64Raw(raw: string): string {
  return Buffer.from(raw, 'utf8').toString('base64');
}

/**
 * Build a minimal TopicMessages wire body with the given message entries.
 * All numbers are safe; we stringify directly (no bignum fields needed here).
 */
function buildWireBody(
  entries: Array<{
    consensus_timestamp: string;
    sequence_number: number;
    payer_account_id: string;
    message: string; // already base64
  }>,
): string {
  return JSON.stringify({ messages: entries });
}

// ---------------------------------------------------------------------------
// Shared fixtures — three representative messages
// ---------------------------------------------------------------------------

const validAuditPayload = {
  v: 1,
  type: 'KYC_GRANTED',
  tokenId: '0.0.123456',
  ts: '2026-05-28T10:00:00.000Z',
  actor: '0.0.1001',
  subject: '0.0.2002',
};

const validWireEntry = {
  consensus_timestamp: '1700000000.000000001',
  sequence_number: 1,
  payer_account_id: '0.0.1001',
  message: toBase64(validAuditPayload),
};

// malformed: base64 of invalid JSON
const malformedWireEntry = {
  consensus_timestamp: '1700000005.000000000',
  sequence_number: 2,
  payer_account_id: '0.0.1001',
  message: toBase64Raw('NOT VALID JSON {{{'),
};

// unrecognized: valid JSON, version 1, but unknown type
const unrecognizedWireEntry = {
  consensus_timestamp: '1700000000.000000002',
  sequence_number: 3,
  payer_account_id: '0.0.1001',
  message: toBase64({
    v: 1,
    type: 'FUTURE_X',
    tokenId: '0.0.123456',
    ts: '2026-05-28T11:00:00.000Z',
    actor: '0.0.1001',
  }),
};

function parsedMessages(): ParsedTopicMessage[] {
  const wireBody = buildWireBody([validWireEntry, malformedWireEntry, unrecognizedWireEntry]);
  const result = parseTopicMessages(wireBody);
  if (result.status !== 'valid') {
    throw new Error(`parseTopicMessages failed unexpectedly: ${result.error}`);
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// sortFeedNewestFirst
// ---------------------------------------------------------------------------

describe('sortFeedNewestFirst', () => {
  it('returns messages sorted by consensusTimestamp descending (newest first)', () => {
    const messages = parsedMessages();
    const sorted = sortFeedNewestFirst(messages);

    // The three timestamps in descending order should be:
    //   1700000005.000000000 (malformed) first
    //   1700000000.000000002 (unrecognized) second
    //   1700000000.000000001 (valid) last
    expect(sorted[0]!.consensusTimestamp).toBe('1700000005.000000000');
    expect(sorted[1]!.consensusTimestamp).toBe('1700000000.000000002');
    expect(sorted[2]!.consensusTimestamp).toBe('1700000000.000000001');
  });

  it('does not mutate the input array', () => {
    const messages = parsedMessages();
    const originalOrder = messages.map((m) => m.consensusTimestamp);
    sortFeedNewestFirst(messages);
    expect(messages.map((m) => m.consensusTimestamp)).toEqual(originalOrder);
  });

  it('handles a list that includes a malformed-audit entry without crashing', () => {
    const messages = parsedMessages();
    expect(() => sortFeedNewestFirst(messages)).not.toThrow();
  });

  it('puts seconds comparison before nanos comparison', () => {
    // Two entries sharing same seconds but different nanos
    const wireBody = buildWireBody([
      {
        consensus_timestamp: '1700000000.000000001',
        sequence_number: 1,
        payer_account_id: '0.0.1001',
        message: toBase64(validAuditPayload),
      },
      {
        consensus_timestamp: '1700000000.000000002',
        sequence_number: 2,
        payer_account_id: '0.0.1001',
        message: toBase64(validAuditPayload),
      },
    ]);
    const result = parseTopicMessages(wireBody);
    if (result.status !== 'valid') throw new Error('unexpected parse failure');
    const sorted = sortFeedNewestFirst(result.value);
    expect(sorted[0]!.consensusTimestamp).toBe('1700000000.000000002');
    expect(sorted[1]!.consensusTimestamp).toBe('1700000000.000000001');
  });
});

// ---------------------------------------------------------------------------
// toAuditRow
// ---------------------------------------------------------------------------

describe('toAuditRow', () => {
  it('returns kind "valid" for a well-formed audit message', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    expect(row.kind).toBe('valid');
  });

  it('valid row carries the decoded type "KYC_GRANTED"', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    if (row.kind !== 'valid') throw new Error('expected valid row');
    expect(row.type).toBe('KYC_GRANTED');
  });

  it('valid row carries the actor account id', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    if (row.kind !== 'valid') throw new Error('expected valid row');
    expect(row.actor).toBe('0.0.1001');
  });

  it('valid row carries the consensusTimestamp from the wire entry', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    expect(row.consensusTimestamp).toBe('1700000000.000000001');
  });

  it('valid row carries the sequenceNumber from the wire entry', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    expect(row.sequenceNumber).toBe(1);
  });

  it('valid row carries the ts field from the decoded audit message', () => {
    const messages = parsedMessages();
    const validMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000001')!;
    const row = toAuditRow(validMsg);
    if (row.kind !== 'valid') throw new Error('expected valid row');
    expect(row.ts).toBe(validAuditPayload.ts);
  });

  it('returns kind "malformed" for a message with invalid base64 payload', () => {
    const messages = parsedMessages();
    const malformedMsg = messages.find((m) => m.consensusTimestamp === '1700000005.000000000')!;
    const row = toAuditRow(malformedMsg);
    expect(row.kind).toBe('malformed');
  });

  it('malformed row carries consensusTimestamp and sequenceNumber', () => {
    const messages = parsedMessages();
    const malformedMsg = messages.find((m) => m.consensusTimestamp === '1700000005.000000000')!;
    const row = toAuditRow(malformedMsg);
    expect(row.consensusTimestamp).toBe('1700000005.000000000');
    expect(row.sequenceNumber).toBe(2);
  });

  it('returns kind "unrecognized" for a message with a future event type', () => {
    const messages = parsedMessages();
    const unrecognizedMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000002')!;
    const row = toAuditRow(unrecognizedMsg);
    expect(row.kind).toBe('unrecognized');
  });

  it('unrecognized row carries consensusTimestamp and sequenceNumber', () => {
    const messages = parsedMessages();
    const unrecognizedMsg = messages.find((m) => m.consensusTimestamp === '1700000000.000000002')!;
    const row = toAuditRow(unrecognizedMsg);
    expect(row.consensusTimestamp).toBe('1700000000.000000002');
    expect(row.sequenceNumber).toBe(3);
  });
});
