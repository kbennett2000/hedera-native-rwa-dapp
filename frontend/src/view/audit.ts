/**
 * Pure transforms for the HCS audit feed. Decoding lives in core (parseTopicMessages
 * → per-entry decodeAuditMessage); this only orders the feed and shapes each entry
 * into a renderable row, honoring the schema's forward-compat (malformed / unrecognized
 * entries render as their own rows, never crash the feed).
 */

import type { ParsedTopicMessage } from '@core';

export type AuditRow =
  | {
      kind: 'valid';
      consensusTimestamp: string;
      sequenceNumber: number;
      type: string;
      actor: string;
      subject?: string;
      amount?: string;
      note?: string;
      ts: string;
    }
  | { kind: 'malformed'; consensusTimestamp: string; sequenceNumber: number }
  | { kind: 'unrecognized'; consensusTimestamp: string; sequenceNumber: number };

/** Parse a "<seconds>.<nanos>" consensus timestamp into a [seconds, nanos] BigInt pair. */
function splitTimestamp(ts: string): [bigint, bigint] {
  const dot = ts.indexOf('.');
  if (dot === -1) return [safeBigInt(ts), 0n];
  return [safeBigInt(ts.slice(0, dot)), safeBigInt(ts.slice(dot + 1))];
}

function safeBigInt(s: string): bigint {
  return /^\d+$/.test(s) ? BigInt(s) : 0n;
}

/** New array sorted newest-first by consensus timestamp (seconds, then nanos). Does not mutate. */
export function sortFeedNewestFirst(messages: ParsedTopicMessage[]): ParsedTopicMessage[] {
  return [...messages].sort((a, b) => {
    const [as, an] = splitTimestamp(a.consensusTimestamp);
    const [bs, bn] = splitTimestamp(b.consensusTimestamp);
    if (as !== bs) return as > bs ? -1 : 1;
    if (an !== bn) return an > bn ? -1 : 1;
    return 0;
  });
}

/** Shape one parsed topic message into a discriminated row for rendering. */
export function toAuditRow(m: ParsedTopicMessage): AuditRow {
  const base = { consensusTimestamp: m.consensusTimestamp, sequenceNumber: m.sequenceNumber };
  if (m.audit.status === 'valid') {
    const a = m.audit.value;
    return {
      kind: 'valid',
      ...base,
      type: a.type,
      actor: a.actor,
      subject: a.subject,
      amount: a.amount,
      note: a.note,
      ts: a.ts,
    };
  }
  if (m.audit.status === 'unrecognized') {
    return { kind: 'unrecognized', ...base };
  }
  return { kind: 'malformed', ...base };
}
