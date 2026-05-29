/**
 * 05-mint — mint new supply to the treasury, then audit it.
 *
 * Usage: tsx src/scripts/05-mint.ts <amount>   (amount in base units)
 */

import { buildMintArgs } from '../core/index.js';
import { executeMint } from '../sdk/index.js';
import { runScript, argv, requireArg, requireTokenAndTopic, appendAudit } from './_runner.js';

await runScript('05-mint', async (ctx, log) => {
  const amount = requireArg(argv(), 0, 'amount');
  const { tokenId, topicId } = requireTokenAndTopic();

  const result = await executeMint(buildMintArgs({ tokenId, amount }), ctx);
  log.info('minted', { tokenId, amount, status: result.status });

  // No subject: minted to treasury.
  await appendAudit(ctx, topicId, { type: 'MINTED', tokenId, amount }, log);
});
