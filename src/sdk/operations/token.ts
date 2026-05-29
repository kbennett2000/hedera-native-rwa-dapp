/**
 * createToken — binds the operator public key to exactly the enabled key-flags from
 * the core builder (the ADR-0002 rule: no key logic reconstructed here).
 */

import { TokenCreateTransaction, TokenType, TokenSupplyType } from '@hashgraph/sdk';
import type { PublicKey } from '@hashgraph/sdk';
import type { TokenCreateArgs } from '../../core/index.js';
import type { OperatorContext } from '../client.js';
import { toInt64Long } from './amounts.js';

/** Pure: marshal validated core args into a configured TokenCreateTransaction. No network. */
export function buildCreateTokenTransaction(
  args: TokenCreateArgs,
  operatorPublicKey: PublicKey,
): TokenCreateTransaction {
  const tx = new TokenCreateTransaction()
    .setTokenName(args.name)
    .setTokenSymbol(args.symbol)
    .setDecimals(args.decimals)
    .setInitialSupply(toInt64Long(args.initialSupply))
    .setTreasuryAccountId(args.treasuryAccountId)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(args.supplyType === 'FINITE' ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
    .setFreezeDefault(args.freezeDefault);

  if (args.maxSupply !== undefined) {
    // HTS rejects a max supply on an INFINITE-supply token; fail clearly client-side
    // rather than let it surface as an opaque consensus error.
    if (args.supplyType === 'INFINITE') {
      throw new Error('INFINITE supply tokens must not set maxSupply');
    }
    tx.setMaxSupply(toInt64Long(args.maxSupply));
  }

  // Bind the operator public key to each ENABLED key only.
  const { keys } = args;
  if (keys.admin) tx.setAdminKey(operatorPublicKey);
  if (keys.kyc) tx.setKycKey(operatorPublicKey);
  if (keys.freeze) tx.setFreezeKey(operatorPublicKey);
  if (keys.wipe) tx.setWipeKey(operatorPublicKey);
  if (keys.pause) tx.setPauseKey(operatorPublicKey);
  if (keys.supply) tx.setSupplyKey(operatorPublicKey);

  return tx;
}

/** Execute token creation; returns the new tokenId in `0.0.x` form. */
export async function executeCreateToken(
  args: TokenCreateArgs,
  ctx: OperatorContext,
): Promise<string> {
  const tx = buildCreateTokenTransaction(args, ctx.operatorPublicKey);
  const response = await tx.execute(ctx.client);
  const receipt = await response.getReceipt(ctx.client);
  if (!receipt.tokenId) {
    throw new Error('token creation succeeded but no tokenId was returned in the receipt');
  }
  return receipt.tokenId.toString();
}
