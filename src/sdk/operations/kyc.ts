/** grantKyc / revokeKyc — the native KYC gate (replaces Part 1's ComplianceRegistry). */

import { TokenGrantKycTransaction, TokenRevokeKycTransaction } from '@hashgraph/sdk';
import type { TokenAccountArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { executeTx } from './execute.js';
import type { TxResult } from './execute.js';

export function buildGrantKycTransaction(args: TokenAccountArgs): TokenGrantKycTransaction {
  return new TokenGrantKycTransaction().setTokenId(args.tokenId).setAccountId(args.accountId);
}

export function buildRevokeKycTransaction(args: TokenAccountArgs): TokenRevokeKycTransaction {
  return new TokenRevokeKycTransaction().setTokenId(args.tokenId).setAccountId(args.accountId);
}

export function executeGrantKyc(args: TokenAccountArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildGrantKycTransaction(args), ctx);
}

export function executeRevokeKyc(args: TokenAccountArgs, ctx: OperatorContext): Promise<TxResult> {
  return executeTx(buildRevokeKycTransaction(args), ctx);
}
