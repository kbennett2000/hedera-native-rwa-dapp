/**
 * Investor action: associate the connected account with the token, signed by the
 * wallet. Args are validated by the core builder; this layer only marshals + signs.
 */

import { TokenAssociateTransaction } from '@hashgraph/sdk';
import type { DAppSigner } from '@hashgraph/hedera-wallet-connect';
import { buildAssociateArgs } from '@core';
import type { AssociateArgs } from '@core';

export async function associateToken(signer: DAppSigner, args: AssociateArgs): Promise<string> {
  const { accountId, tokenId } = buildAssociateArgs(args);
  const tx = new TokenAssociateTransaction().setAccountId(accountId).setTokenIds([tokenId]);
  const frozen = await tx.freezeWithSigner(signer);
  const response = await frozen.executeWithSigner(signer);
  const receipt = await response.getReceiptWithSigner(signer);
  return receipt.status.toString();
}
