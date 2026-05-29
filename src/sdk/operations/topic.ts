/**
 * createTopic + submitAuditMessage. The topic is the per-token HCS audit trail
 * (ADR-0004). submitAuditMessage takes an already-encoded audit string from
 * `encodeAuditMessage` — it does no schema work itself.
 */

import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import type { PublicKey } from '@hashgraph/sdk';
import type { OperatorContext } from '../client.js';

/** Pure: configure the audit-topic creation transaction (operator owns admin + submit keys). */
export function buildCreateTopicTransaction(
  memo: string,
  operatorPublicKey: PublicKey,
): TopicCreateTransaction {
  return new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setAdminKey(operatorPublicKey)
    .setSubmitKey(operatorPublicKey);
}

/** Pure: configure a topic message submission with a pre-encoded audit message. */
export function buildSubmitMessageTransaction(
  topicId: string,
  message: string,
): TopicMessageSubmitTransaction {
  return new TopicMessageSubmitTransaction().setTopicId(topicId).setMessage(message);
}

/** Execute topic creation; returns the new topicId in `0.0.x` form. */
export async function executeCreateTopic(memo: string, ctx: OperatorContext): Promise<string> {
  const tx = buildCreateTopicTransaction(memo, ctx.operatorPublicKey);
  const response = await tx.execute(ctx.client);
  const receipt = await response.getReceipt(ctx.client);
  if (!receipt.topicId) {
    throw new Error('topic creation succeeded but no topicId was returned in the receipt');
  }
  return receipt.topicId.toString();
}

export interface SubmitAuditResult {
  status: string;
  sequenceNumber: string;
}

/** Submit one pre-encoded audit message to the topic. */
export async function executeSubmitAuditMessage(
  topicId: string,
  message: string,
  ctx: OperatorContext,
): Promise<SubmitAuditResult> {
  const tx = buildSubmitMessageTransaction(topicId, message);
  const response = await tx.execute(ctx.client);
  const receipt = await response.getReceipt(ctx.client);
  return {
    status: receipt.status.toString(),
    sequenceNumber: receipt.topicSequenceNumber?.toString() ?? '',
  };
}
