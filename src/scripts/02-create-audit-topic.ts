/**
 * 02-create-audit-topic — create the per-token HCS audit topic (ADR-0004), then
 * record TOPIC_CREATED and backfill TOKEN_CREATED for the token from 01 (the topic
 * must exist before any audit message can be submitted — see ADR/plan).
 *
 * Usage: tsx src/scripts/02-create-audit-topic.ts
 */

import { executeCreateTopic, writeDeployments, readDeployments } from '../sdk/index.js';
import { runScript, appendAudit } from './_runner.js';

await runScript('02-create-audit-topic', async (ctx, log) => {
  const { tokenId, topicId: existingTopicId } = readDeployments();
  if (!tokenId) throw new Error('no tokenId in deployments.json — run 01-create-token first');
  if (existingTopicId) {
    throw new Error(
      `an audit topic already exists in deployments.json (${existingTopicId}) — delete deployments.json to reset`,
    );
  }

  const topicId = await executeCreateTopic(`RWA compliance audit trail for token ${tokenId}`, ctx);
  writeDeployments({ topicId });
  log.info('audit topic created', { topicId, tokenId });

  await appendAudit(ctx, topicId, { type: 'TOPIC_CREATED', tokenId }, log);
  await appendAudit(ctx, topicId, { type: 'TOKEN_CREATED', tokenId }, log);
  log.info('recorded TOPIC_CREATED and backfilled TOKEN_CREATED');
});
