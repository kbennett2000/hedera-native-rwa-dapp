/** wipe — clawback: burn a holder's balance. Amount marshalled with the int64 guard. */

import { TokenWipeTransaction } from '@hashgraph/sdk';
import type { WipeArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { toInt64Long } from './amounts.js';
import { executeTx } from './execute.js';
import type { TxResult } from './execute.js';

export function buildWipeTransaction(args: WipeArgs): TokenWipeTransaction {
  return new TokenWipeTransaction()
    .setTokenId(args.tokenId)
    .setAccountId(args.accountId)
    .setAmount(toInt64Long(args.amount));
}

export function executeWipe(args: WipeArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildWipeTransaction(args), ctx);
}
