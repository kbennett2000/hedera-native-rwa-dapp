/**
 * 08-pause — pause (or unpause) all transfers of the token (native emergency halt), then audit it.
 *
 * Usage: tsx src/scripts/08-pause.ts [--unpause]
 */

import { buildPauseArgs, buildUnpauseArgs } from '../core/index.js';
import { executePause, executeUnpause } from '../sdk/index.js';
import { runScript, argv, hasFlag, requireTokenAndTopic, appendAudit } from './_runner.js';

await runScript('08-pause', async (ctx, log) => {
  const unpause = hasFlag(argv(), '--unpause');
  const { tokenId, topicId } = requireTokenAndTopic();

  if (unpause) {
    const result = await executeUnpause(buildUnpauseArgs({ tokenId }), ctx);
    log.info('unpaused', { tokenId, status: result.status });
    await appendAudit(ctx, topicId, { type: 'UNPAUSED', tokenId }, log);
  } else {
    const result = await executePause(buildPauseArgs({ tokenId }), ctx);
    log.info('paused', { tokenId, status: result.status });
    await appendAudit(ctx, topicId, { type: 'PAUSED', tokenId }, log);
  }
});
