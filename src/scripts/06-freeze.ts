/**
 * 06-freeze — freeze (or unfreeze) an account's token balance (native legal hold), then audit it.
 *
 * Usage: tsx src/scripts/06-freeze.ts <accountId> [--unfreeze]
 */

import { buildFreezeArgs, buildUnfreezeArgs } from '../core/index.js';
import { executeFreeze, executeUnfreeze } from '../sdk/index.js';
import {
  runScript,
  argv,
  requireArg,
  hasFlag,
  requireTokenAndTopic,
  appendAudit,
} from './_runner.js';

await runScript('06-freeze', async (ctx, log) => {
  const args = argv();
  const accountId = requireArg(args, 0, 'accountId');
  const unfreeze = hasFlag(args, '--unfreeze');
  const { tokenId, topicId } = requireTokenAndTopic();

  if (unfreeze) {
    const result = await executeUnfreeze(buildUnfreezeArgs({ tokenId, accountId }), ctx);
    log.info('unfrozen', { tokenId, accountId, status: result.status });
    await appendAudit(ctx, topicId, { type: 'UNFROZEN', tokenId, subject: accountId }, log);
  } else {
    const result = await executeFreeze(buildFreezeArgs({ tokenId, accountId }), ctx);
    log.info('frozen', { tokenId, accountId, status: result.status });
    await appendAudit(ctx, topicId, { type: 'FROZEN', tokenId, subject: accountId }, log);
  }
});
