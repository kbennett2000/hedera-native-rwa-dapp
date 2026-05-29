/**
 * HCS audit message schema — the contract in docs/hcs-audit-schema.md, in code.
 *
 * `encodeAuditMessage` validates our own outgoing data and throws on anything
 * invalid (fail-fast — the issuer controls this input). `decodeAuditMessage`
 * treats the input as untrusted topic content and NEVER throws: it returns a
 * discriminated result distinguishing valid / malformed / unrecognized so the
 * audit feed can render a bad or future-versioned message as its own row rather
 * than erroring the whole feed.
 *
 * Amounts are positive-integer STRINGS (base units); a `number` is rejected.
 */

import { z } from 'zod';
import { ENTITY_ID_RE, POSITIVE_INT_RE } from '../ids.js';
import { ok, malformed, unrecognized } from '../result.js';
import type { DecodeResult } from '../result.js';

export const AUDIT_EVENT_TYPES = [
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
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/** Current audit schema version. Bumped only on a breaking change (see the doc + ADR-0004). */
export const AUDIT_SCHEMA_VERSION = 1;

export interface AuditMessage {
  v: 1;
  type: AuditEventType;
  tokenId: string;
  ts: string;
  actor: string;
  subject?: string;
  amount?: string;
  note?: string;
}

/** Event types that MUST carry a `subject`. */
const SUBJECT_REQUIRED: ReadonlySet<AuditEventType> = new Set([
  'KYC_GRANTED',
  'KYC_REVOKED',
  'FROZEN',
  'UNFROZEN',
  'WIPED',
]);

/** Event types that MUST carry an `amount`. */
const AMOUNT_REQUIRED: ReadonlySet<AuditEventType> = new Set(['MINTED', 'WIPED']);

const entityId = z.string().regex(ENTITY_ID_RE, 'must be a shard.realm.num id');

const AuditMessageSchema = z
  .object({
    v: z.literal(AUDIT_SCHEMA_VERSION),
    type: z.enum(AUDIT_EVENT_TYPES),
    tokenId: entityId,
    ts: z.string().datetime({ message: 'must be an ISO-8601 UTC timestamp' }),
    actor: entityId,
    subject: entityId.optional(),
    amount: z.string().regex(POSITIVE_INT_RE, 'must be a positive integer string').optional(),
    note: z.string().max(120, 'note must be <= 120 characters').optional(),
  })
  .superRefine((msg, ctx) => {
    if (SUBJECT_REQUIRED.has(msg.type) && msg.subject === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `${msg.type} requires a subject`,
        path: ['subject'],
      });
    }
    if (AMOUNT_REQUIRED.has(msg.type) && msg.amount === undefined) {
      ctx.addIssue({ code: 'custom', message: `${msg.type} requires an amount`, path: ['amount'] });
    }
  });

/** Validate and serialize an outgoing audit message. Throws (ZodError) on invalid input. */
export function encodeAuditMessage(msg: AuditMessage): string {
  const validated = AuditMessageSchema.parse(msg);
  return JSON.stringify(validated);
}

const KNOWN_TYPES: ReadonlySet<string> = new Set(AUDIT_EVENT_TYPES);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Decode untrusted topic content. Never throws.
 *
 * Forward-compat ordering (per docs/hcs-audit-schema.md):
 *  - a future schema version (`v` is an integer > 1) -> unrecognized
 *  - a same-version message with an unknown `type`   -> unrecognized
 *  - anything else that fails the v1 schema           -> malformed
 */
export function decodeAuditMessage(raw: string): DecodeResult<AuditMessage> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return malformed('invalid JSON', raw);
  }

  if (!isPlainObject(parsed)) {
    return malformed('audit message must be a JSON object', raw);
  }

  const version = parsed['v'];
  if (typeof version === 'number' && Number.isInteger(version) && version > AUDIT_SCHEMA_VERSION) {
    return unrecognized(parsed);
  }
  if (version !== AUDIT_SCHEMA_VERSION) {
    return malformed('missing or invalid schema version', raw);
  }

  const type = parsed['type'];
  if (typeof type === 'string' && !KNOWN_TYPES.has(type)) {
    return unrecognized(parsed);
  }

  const result = AuditMessageSchema.safeParse(parsed);
  if (!result.success) {
    return malformed(result.error.message, raw);
  }
  return ok(result.data);
}
