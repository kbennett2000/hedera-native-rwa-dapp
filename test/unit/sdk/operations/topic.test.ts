/**
 * Unit tests for src/sdk/operations/topic.ts
 *   buildCreateTopicTransaction
 *   buildSubmitMessageTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TopicCreateTransaction: topicMemo, adminKey (.toString()), submitKey (.toString())
 *   TopicMessageSubmitTransaction: topicId (.toString()),
 *     message (Uint8Array/Buffer — decode via Buffer.from(...).toString('utf8'))
 */

import { describe, it, expect } from 'vitest';
import { PrivateKey } from '@hashgraph/sdk';
import {
  buildCreateTopicTransaction,
  buildSubmitMessageTransaction,
} from '../../../../src/sdk/operations/topic.js';

const operatorKey = PrivateKey.generateECDSA();
const operatorPublicKey = operatorKey.publicKey;

// ---------------------------------------------------------------------------
// buildCreateTopicTransaction
// ---------------------------------------------------------------------------

describe('buildCreateTopicTransaction', () => {
  it('sets the topic memo from the memo argument', () => {
    const tx = buildCreateTopicTransaction('Acme RWA Audit Trail', operatorPublicKey);
    expect(tx.topicMemo).toBe('Acme RWA Audit Trail');
  });

  it('sets adminKey to the operator public key', () => {
    const tx = buildCreateTopicTransaction('Audit', operatorPublicKey);
    expect(tx.adminKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets submitKey to the operator public key', () => {
    const tx = buildCreateTopicTransaction('Audit', operatorPublicKey);
    expect(tx.submitKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('accepts an empty memo string', () => {
    const tx = buildCreateTopicTransaction('', operatorPublicKey);
    expect(tx.topicMemo).toBe('');
  });
});

// ---------------------------------------------------------------------------
// buildSubmitMessageTransaction
// ---------------------------------------------------------------------------

describe('buildSubmitMessageTransaction', () => {
  const TOPIC_ID = '0.0.7007';
  const MESSAGE =
    '{"v":1,"type":"KYC_GRANTED","tokenId":"0.0.123456","ts":"2026-05-28T14:32:00Z","actor":"0.0.1001","subject":"0.0.2002"}';

  it('sets topicId from the topicId argument', () => {
    const tx = buildSubmitMessageTransaction(TOPIC_ID, MESSAGE);
    expect(tx.topicId?.toString()).toBe(TOPIC_ID);
  });

  it('round-trips the message string through the Uint8Array getter', () => {
    const tx = buildSubmitMessageTransaction(TOPIC_ID, MESSAGE);
    // The SDK stores the message as a Buffer/Uint8Array; decode it back
    const decoded = Buffer.from(tx.message as Uint8Array).toString('utf8');
    expect(decoded).toBe(MESSAGE);
  });

  it('handles a simple short message', () => {
    const short = 'hello';
    const tx = buildSubmitMessageTransaction(TOPIC_ID, short);
    const decoded = Buffer.from(tx.message as Uint8Array).toString('utf8');
    expect(decoded).toBe(short);
  });
});
