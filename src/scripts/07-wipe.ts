/**
 * 07-wipe — clawback: burn an account's token balance (native wipe), then audit it.
 *
 * Usage: tsx src/scripts/07-wipe.ts <accountId> <amount>   (amount in base units)
 */

import { buildWipeArgs } from '../core/index.js';
import { executeWipe } from '../sdk/index.js';
import { runScript, argv, requireArg, requireTokenAndTopic, appendAudit } from './_runner.js';

await runScript('07-wipe', async (ctx, log) => {
  const args = argv();
  const accountId = requireArg(args, 0, 'accountId');
  const amount = requireArg(args, 1, 'amount');
  const { tokenId, topicId } = requireTokenAndTopic();

  const result = await executeWipe(buildWipeArgs({ tokenId, accountId, amount }), ctx);
  log.info('wiped', { tokenId, accountId, amount, status: result.status });

  await appendAudit(ctx, topicId, { type: 'WIPED', tokenId, subject: accountId, amount }, log);
});
