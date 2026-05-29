/**
 * Mirror Node REST response shapes we consume, as Zod wire schemas (snake_case,
 * tolerant of unused/extra fields) plus the camelCase domain types the rest of the
 * app uses. Field names are grounded in the live Mirror Node API; see ADR-0006 for
 * why amount fields are validated as strings (the bigint-safe parser supplies them
 * as exact strings before validation).
 *
 * Schemas validate; the snake_case -> camelCase mapping lives in parse.ts.
 */

import { z } from 'zod';
import { ENTITY_ID_RE } from '../ids.js';
import type { DecodeResult } from '../result.js';
import type { AuditMessage } from '../schema/auditMessage.js';

const entityId = z.string().regex(ENTITY_ID_RE, 'must be a shard.realm.num id');

// --- Domain types (camelCase) ---------------------------------------------------

export type TokenKey = { _type: string; key: string } | null;

export type TokenType = 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
export type PauseStatus = 'PAUSED' | 'UNPAUSED' | 'NOT_APPLICABLE';
export type KycStatus = 'GRANTED' | 'REVOKED' | 'NOT_APPLICABLE';
export type FreezeStatus = 'FROZEN' | 'UNFROZEN' | 'NOT_APPLICABLE';

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  treasuryAccountId: string;
  type: TokenType;
  pauseStatus: PauseStatus;
  adminKey: TokenKey;
  kycKey: TokenKey;
  freezeKey: TokenKey;
  wipeKey: TokenKey;
  pauseKey: TokenKey;
  supplyKey: TokenKey;
}

export interface AccountTokenRelationship {
  tokenId: string;
  balance: string;
  kycStatus: KycStatus;
  freezeStatus: FreezeStatus;
  automaticAssociation: boolean;
}

export interface TokenBalanceEntry {
  account: string;
  balance: string;
}

export interface TokenBalances {
  timestamp: string | null;
  balances: TokenBalanceEntry[];
}

export interface ParsedTopicMessage {
  consensusTimestamp: string;
  sequenceNumber: number;
  payerAccountId: string;
  audit: DecodeResult<AuditMessage>;
}

// --- Wire schemas (snake_case; extra fields stripped) ---------------------------

// `balance` / `total_supply` arrive as exact strings from parseJsonBigintSafe.
const tokenKeyWire = z.object({ _type: z.string(), key: z.string() }).nullable();

export const TokenInfoWireSchema = z.object({
  token_id: entityId,
  name: z.string(),
  symbol: z.string(),
  // string ("2") on the token-info endpoint, number (2) on the token-list endpoint.
  decimals: z.coerce.number().int().nonnegative(),
  total_supply: z.string(),
  treasury_account_id: z.string(),
  type: z.enum(['FUNGIBLE_COMMON', 'NON_FUNGIBLE_UNIQUE']),
  pause_status: z.enum(['PAUSED', 'UNPAUSED', 'NOT_APPLICABLE']),
  admin_key: tokenKeyWire,
  kyc_key: tokenKeyWire,
  freeze_key: tokenKeyWire,
  wipe_key: tokenKeyWire,
  pause_key: tokenKeyWire,
  supply_key: tokenKeyWire,
});

export const AccountTokenWireSchema = z.object({
  token_id: z.string(),
  balance: z.string(),
  kyc_status: z.enum(['GRANTED', 'REVOKED', 'NOT_APPLICABLE']),
  freeze_status: z.enum(['FROZEN', 'UNFROZEN', 'NOT_APPLICABLE']),
  automatic_association: z.boolean(),
});

export const AccountTokensBodySchema = z.object({
  tokens: z.array(AccountTokenWireSchema),
});

export const TokenBalanceEntryWireSchema = z.object({
  account: z.string(),
  balance: z.string(),
});

export const TokenBalancesBodySchema = z.object({
  timestamp: z.string().nullable(),
  balances: z.array(TokenBalanceEntryWireSchema),
});

export const TopicMessageWireSchema = z.object({
  consensus_timestamp: z.string(),
  sequence_number: z.number(),
  payer_account_id: z.string(),
  message: z.string(),
});

export const TopicMessagesBodySchema = z.object({
  messages: z.array(TopicMessageWireSchema),
});
