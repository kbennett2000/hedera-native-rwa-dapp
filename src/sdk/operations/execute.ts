/**
 * Shared execution helper: fire a built transaction and shape the receipt into a
 * small typed result. Kept trivial on purpose (ADR-0002) — the SDK handles retries
 * and receipt polling; we add no network policy of our own (ADR-0007).
 */

import type { Transaction } from '@hashgraph/sdk';
import type { OperatorContext } from '../client.js';

export interface TxResult {
  status: string;
  transactionId: string;
}

export async function executeTx(tx: Transaction, ctx: OperatorContext): Promise<TxResult> {
  const response = await tx.execute(ctx.client);
  const receipt = await response.getReceipt(ctx.client);
  return {
    status: receipt.status.toString(),
    transactionId: response.transactionId.toString(),
  };
}
