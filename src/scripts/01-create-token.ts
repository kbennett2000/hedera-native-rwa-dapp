/**
 * 01-create-token — create the compliance-gated fungible RWA token with the full
 * native key set (kyc/freeze/wipe/pause/supply/admin), treasury = operator.
 *
 * Usage: tsx src/scripts/01-create-token.ts [name] [symbol]
 * Writes tokenId + operatorId to deployments.json. Does NOT write an audit message
 * (the topic does not exist yet); 02-create-audit-topic records TOKEN_CREATED.
 */

import { buildCreateTokenArgs } from '../core/index.js';
import { executeCreateToken, writeDeployments, readDeployments } from '../sdk/index.js';
import { runScript, argv } from './_runner.js';

await runScript('01-create-token', async (ctx, log) => {
  const existing = readDeployments().tokenId;
  if (existing) {
    throw new Error(
      `a token already exists in deployments.json (${existing}) — delete deployments.json to create a new one`,
    );
  }

  const args = argv();
  const name = args[0] ?? 'Acme RWA';
  const symbol = args[1] ?? 'ARWA';

  const tokenArgs = buildCreateTokenArgs({
    name,
    symbol,
    decimals: 2,
    initialSupply: '0',
    treasuryAccountId: ctx.operatorId,
    tokenType: 'FUNGIBLE_COMMON',
    supplyType: 'FINITE',
    maxSupply: '1000000',
    freezeDefault: false,
    keys: { admin: true, kyc: true, freeze: true, wipe: true, pause: true, supply: true },
  });

  const tokenId = await executeCreateToken(tokenArgs, ctx);
  writeDeployments({ tokenId, operatorId: ctx.operatorId });
  log.info('token created', { tokenId, name, symbol, treasury: ctx.operatorId });
  log.info('next: run 02-create-audit-topic to create the HCS topic and record TOKEN_CREATED');
});
