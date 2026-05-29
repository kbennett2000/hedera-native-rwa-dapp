/**
 * Pure transaction-argument builders.
 *
 * Each validates issuer-supplied input and returns plain, validated data — it does
 * NOT import or call the Hedera SDK and executes nothing (ADR-0002). The sdk/ layer
 * (next cycle) consumes these args, binds the operator key to enabled token keys,
 * and fires the transaction.
 *
 * Input here is issuer-controlled, so builders fail fast: they THROW (ZodError) on
 * invalid input, unlike the Mirror Node parsers which return a Result for untrusted
 * external data. Amounts are strings in base units; a `number` is rejected.
 */

import { z } from 'zod';
import { ENTITY_ID_RE, POSITIVE_INT_RE, NON_NEGATIVE_INT_RE } from '../ids.js';

const entityId = z.string().regex(ENTITY_ID_RE, 'must be a shard.realm.num id');
const positiveAmount = z.string().regex(POSITIVE_INT_RE, 'must be a positive integer string');
const nonNegativeAmount = z
  .string()
  .regex(NON_NEGATIVE_INT_RE, 'must be a non-negative integer string');

// --- createToken ----------------------------------------------------------------

const TokenKeyFlagsSchema = z.object({
  admin: z.boolean(),
  kyc: z.boolean(),
  freeze: z.boolean(),
  wipe: z.boolean(),
  pause: z.boolean(),
  supply: z.boolean(),
});

const ALL_KEYS_ON = { admin: true, kyc: true, freeze: true, wipe: true, pause: true, supply: true };

const CreateTokenArgsSchema = z
  .object({
    name: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().nonnegative(),
    initialSupply: nonNegativeAmount,
    treasuryAccountId: entityId,
    tokenType: z.literal('FUNGIBLE_COMMON'),
    supplyType: z.enum(['FINITE', 'INFINITE']),
    maxSupply: nonNegativeAmount.optional(),
    freezeDefault: z.boolean(),
    keys: TokenKeyFlagsSchema.default(ALL_KEYS_ON),
  })
  .superRefine((v, ctx) => {
    if (v.supplyType === 'FINITE' && v.maxSupply === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'FINITE supply requires maxSupply',
        path: ['maxSupply'],
      });
    }
  });

export type TokenKeyFlags = z.output<typeof TokenKeyFlagsSchema>;
export type TokenCreateArgs = z.output<typeof CreateTokenArgsSchema>;
export type TokenCreateInput = z.input<typeof CreateTokenArgsSchema>;

export function buildCreateTokenArgs(input: TokenCreateInput): TokenCreateArgs {
  return CreateTokenArgsSchema.parse(input);
}

// --- single-action builders -----------------------------------------------------

const TokenAccountSchema = z.object({ tokenId: entityId, accountId: entityId });
const TokenOnlySchema = z.object({ tokenId: entityId });
const MintSchema = z.object({ tokenId: entityId, amount: positiveAmount });
const WipeSchema = z.object({ tokenId: entityId, accountId: entityId, amount: positiveAmount });

export type TokenAccountArgs = z.output<typeof TokenAccountSchema>;
export type TokenOnlyArgs = z.output<typeof TokenOnlySchema>;
export type MintArgs = z.output<typeof MintSchema>;
export type WipeArgs = z.output<typeof WipeSchema>;

export function buildGrantKycArgs(input: TokenAccountArgs): TokenAccountArgs {
  return TokenAccountSchema.parse(input);
}

export function buildRevokeKycArgs(input: TokenAccountArgs): TokenAccountArgs {
  return TokenAccountSchema.parse(input);
}

export function buildMintArgs(input: MintArgs): MintArgs {
  return MintSchema.parse(input);
}

export function buildWipeArgs(input: WipeArgs): WipeArgs {
  return WipeSchema.parse(input);
}

export function buildFreezeArgs(input: TokenAccountArgs): TokenAccountArgs {
  return TokenAccountSchema.parse(input);
}

export function buildUnfreezeArgs(input: TokenAccountArgs): TokenAccountArgs {
  return TokenAccountSchema.parse(input);
}

export function buildPauseArgs(input: TokenOnlyArgs): TokenOnlyArgs {
  return TokenOnlySchema.parse(input);
}

export function buildUnpauseArgs(input: TokenOnlyArgs): TokenOnlyArgs {
  return TokenOnlySchema.parse(input);
}

// --- investor-action builders (Cycle 3) -----------------------------------------
// Associate and transfer are the only investor-signed actions (ADR-0003). The args
// are validated here in core (same doctrine as the issuer builders); the frontend
// signs/submits the validated data via the connected wallet.

const AssociateSchema = z.object({ accountId: entityId, tokenId: entityId });
const TransferSchema = z.object({
  tokenId: entityId,
  fromAccountId: entityId,
  toAccountId: entityId,
  amount: positiveAmount,
});

export type AssociateArgs = z.output<typeof AssociateSchema>;
export type TransferArgs = z.output<typeof TransferSchema>;

export function buildAssociateArgs(input: AssociateArgs): AssociateArgs {
  return AssociateSchema.parse(input);
}

export function buildTransferArgs(input: TransferArgs): TransferArgs {
  return TransferSchema.parse(input);
}
