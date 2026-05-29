/** pause / unpause — the native emergency halt on all transfers of the token. */

import { TokenPauseTransaction, TokenUnpauseTransaction } from '@hashgraph/sdk';
import type { TokenOnlyArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { executeTx } from './execute.js';
import type { TxResult } from './execute.js';

export function buildPauseTransaction(args: TokenOnlyArgs): TokenPauseTransaction {
  return new TokenPauseTransaction().setTokenId(args.tokenId);
}

export function buildUnpauseTransaction(args: TokenOnlyArgs): TokenUnpauseTransaction {
  return new TokenUnpauseTransaction().setTokenId(args.tokenId);
}

export function executePause(args: TokenOnlyArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildPauseTransaction(args), ctx);
}

export function executeUnpause(args: TokenOnlyArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildUnpauseTransaction(args), ctx);
}
