/** freeze / unfreeze — the native legal-hold on a single account's token balance. */

import { TokenFreezeTransaction, TokenUnfreezeTransaction } from '@hashgraph/sdk';
import type { TokenAccountArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { executeTx } from './execute.js';
import type { TxResult } from './execute.js';

export function buildFreezeTransaction(args: TokenAccountArgs): TokenFreezeTransaction {
  return new TokenFreezeTransaction().setTokenId(args.tokenId).setAccountId(args.accountId);
}

export function buildUnfreezeTransaction(args: TokenAccountArgs): TokenUnfreezeTransaction {
  return new TokenUnfreezeTransaction().setTokenId(args.tokenId).setAccountId(args.accountId);
}

export function executeFreeze(args: TokenAccountArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildFreezeTransaction(args), ctx);
}

export function executeUnfreeze(args: TokenAccountArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildUnfreezeTransaction(args), ctx);
}
