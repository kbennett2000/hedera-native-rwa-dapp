/**
 * 04-revoke-kyc — revoke KYC from an account (the native whitelist remove), then audit it.
 *
 * Usage: tsx src/scripts/04-revoke-kyc.ts <accountId>
 */

import { buildRevokeKycArgs } from '../core/index.js';
import { executeRevokeKyc } from '../sdk/index.js';
import { runScript, argv, requireArg, requireTokenAndTopic, appendAudit } from './_runner.js';

await runScript('04-revoke-kyc', async (ctx, log) => {
  const accountId = requireArg(argv(), 0, 'accountId');
  const { tokenId, topicId } = requireTokenAndTopic();

  const result = await executeRevokeKyc(buildRevokeKycArgs({ tokenId, accountId }), ctx);
  log.info('kyc revoked', { tokenId, accountId, status: result.status });

  await appendAudit(ctx, topicId, { type: 'KYC_REVOKED', tokenId, subject: accountId }, log);
});
