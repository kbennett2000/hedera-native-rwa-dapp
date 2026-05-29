/**
 * Pure parsers for Mirror Node REST responses.
 *
 * Each takes the raw response TEXT (not a pre-parsed object) so amount fields are
 * preserved bigint-safe via parseJsonBigintSafe (ADR-0006), then validates the wire
 * shape with Zod and maps snake_case -> camelCase domain types. External data is
 * untrusted, so these NEVER throw: invalid JSON or an unexpected shape returns a
 * `malformed` Result. Topic-message audit payloads are decoded per-entry, so one
 * bad message never errors the whole feed.
 */

import { ok, malformed } from '../result.js';
import type { Malformed, Result } from '../result.js';
import { decodeAuditMessage } from '../schema/auditMessage.js';
import { parseJsonBigintSafe, MIRROR_AMOUNT_KEYS } from './json.js';
import {
  TokenInfoWireSchema,
  AccountTokensBodySchema,
  TokenBalancesBodySchema,
  TopicMessagesBodySchema,
} from './types.js';
import type {
  TokenInfo,
  AccountTokenRelationship,
  TokenBalances,
  ParsedTopicMessage,
} from './types.js';

/**
 * Parse the raw text bigint-safe; returns a `Malformed` Result on invalid JSON /
 * unsupported runtime, otherwise the parsed value. Callers detect the failure case
 * with the canonical `status` discriminator (`'status' in result`).
 */
function safeParseText(rawText: string): { value: unknown } | Malformed {
  try {
    return { value: parseJsonBigintSafe(rawText, MIRROR_AMOUNT_KEYS) };
  } catch (err) {
    return malformed(err instanceof Error ? err.message : 'invalid JSON', rawText);
  }
}

function base64ToUtf8(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function parseTokenInfo(rawText: string): Result<TokenInfo> {
  const parsed = safeParseText(rawText);
  if ('status' in parsed) return parsed;

  const result = TokenInfoWireSchema.safeParse(parsed.value);
  if (!result.success) return malformed(result.error.message, rawText);

  const w = result.data;
  return ok({
    tokenId: w.token_id,
    name: w.name,
    symbol: w.symbol,
    decimals: w.decimals,
    totalSupply: w.total_supply,
    treasuryAccountId: w.treasury_account_id,
    type: w.type,
    pauseStatus: w.pause_status,
    adminKey: w.admin_key,
    kycKey: w.kyc_key,
    freezeKey: w.freeze_key,
    wipeKey: w.wipe_key,
    pauseKey: w.pause_key,
    supplyKey: w.supply_key,
  });
}

export function parseAccountTokens(rawText: string): Result<AccountTokenRelationship[]> {
  const parsed = safeParseText(rawText);
  if ('status' in parsed) return parsed;

  const result = AccountTokensBodySchema.safeParse(parsed.value);
  if (!result.success) return malformed(result.error.message, rawText);

  return ok(
    result.data.tokens.map((t) => ({
      tokenId: t.token_id,
      balance: t.balance,
      kycStatus: t.kyc_status,
      freezeStatus: t.freeze_status,
      automaticAssociation: t.automatic_association,
    })),
  );
}

export function parseTokenBalances(rawText: string): Result<TokenBalances> {
  const parsed = safeParseText(rawText);
  if ('status' in parsed) return parsed;

  const result = TokenBalancesBodySchema.safeParse(parsed.value);
  if (!result.success) return malformed(result.error.message, rawText);

  return ok({
    timestamp: result.data.timestamp,
    balances: result.data.balances.map((b) => ({ account: b.account, balance: b.balance })),
  });
}

export function parseTopicMessages(rawText: string): Result<ParsedTopicMessage[]> {
  const parsed = safeParseText(rawText);
  if ('status' in parsed) return parsed;

  const result = TopicMessagesBodySchema.safeParse(parsed.value);
  if (!result.success) return malformed(result.error.message, rawText);

  return ok(
    result.data.messages.map((m) => ({
      consensusTimestamp: m.consensus_timestamp,
      sequenceNumber: m.sequence_number,
      payerAccountId: m.payer_account_id,
      audit: decodeAuditMessage(base64ToUtf8(m.message)),
    })),
  );
}
