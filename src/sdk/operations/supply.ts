/** mint — increases supply to the treasury. Amount marshalled with the int64 guard. */

import { TokenMintTransaction } from '@hashgraph/sdk';
import type { MintArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { toInt64Long } from './amounts.js';
import { executeTx } from './execute.js';
import type { TxResult } from './execute.js';

export function buildMintTransaction(args: MintArgs): TokenMintTransaction {
  return new TokenMintTransaction().setTokenId(args.tokenId).setAmount(toInt64Long(args.amount));
}

export function executeMint(args: MintArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildMintTransaction(args), ctx);
}
