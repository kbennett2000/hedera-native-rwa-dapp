/**
 * 03-grant-kyc — grant KYC to an account (the native whitelist add), then audit it.
 *
 * Usage: tsx src/scripts/03-grant-kyc.ts <accountId>
 */

import { buildGrantKycArgs } from '../core/index.js';
import { executeGrantKyc } from '../sdk/index.js';
import { runScript, argv, requireArg, requireTokenAndTopic, appendAudit } from './_runner.js';

await runScript('03-grant-kyc', async (ctx, log) => {
  const accountId = requireArg(argv(), 0, 'accountId');
  const { tokenId, topicId } = requireTokenAndTopic();

  const result = await executeGrantKyc(buildGrantKycArgs({ tokenId, accountId }), ctx);
  log.info('kyc granted', { tokenId, accountId, status: result.status });

  await appendAudit(ctx, topicId, { type: 'KYC_GRANTED', tokenId, subject: accountId }, log);
});
