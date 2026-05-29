/**
 * Investor action: transfer the token to another account, signed by the wallet.
 *
 * The teaching moment (ADR-0001): when the counterparty isn't KYC-approved / is frozen
 * / the token is paused, the NETWORK rejects the transfer at consensus — the native
 * analogue of Part 1's contract revert. We surface that rejection status verbatim, and
 * keep it distinct from client-side validation errors (which never reach the network).
 */

import { Long, ReceiptStatusError, TransferTransaction } from '@hashgraph/sdk';
import type { DAppSigner } from '@hashgraph/hedera-wallet-connect';
import { buildTransferArgs } from '@core';
import type { TransferArgs } from '@core';

/** Maximum HTS amount — token amounts are signed int64. */
const MAX_INT64 = 9223372036854775807n;

export type TransferOutcome =
  | { ok: true; status: string }
  | { ok: false; kind: 'validation' | 'network'; status: string };

function networkStatus(err: unknown): string {
  if (err instanceof ReceiptStatusError) return err.status.toString();
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (status != null) return String(status);
  }
  return err instanceof Error ? err.message : 'transfer failed';
}

export async function transferToken(
  signer: DAppSigner,
  args: TransferArgs,
): Promise<TransferOutcome> {
  // Phase 1 — client-side validation (never touches the network).
  let validated: TransferArgs;
  try {
    validated = buildTransferArgs(args);
    if (BigInt(validated.amount) > MAX_INT64) {
      return { ok: false, kind: 'validation', status: 'amount exceeds the HTS int64 maximum' };
    }
  } catch (err) {
    return {
      ok: false,
      kind: 'validation',
      status: err instanceof Error ? err.message : 'invalid input',
    };
  }

  // Phase 2 — sign + submit. A compliance rejection (KYC / freeze / pause) lands in catch.
  const value = Long.fromString(validated.amount);
  const tx = new TransferTransaction()
    .addTokenTransfer(validated.tokenId, validated.fromAccountId, value.negate())
    .addTokenTransfer(validated.tokenId, validated.toAccountId, value);

  try {
    const frozen = await tx.freezeWithSigner(signer);
    const response = await frozen.executeWithSigner(signer);
    const receipt = await response.getReceiptWithSigner(signer);
    return { ok: true, status: receipt.status.toString() };
  } catch (err) {
    return { ok: false, kind: 'network', status: networkStatus(err) };
  }
}
