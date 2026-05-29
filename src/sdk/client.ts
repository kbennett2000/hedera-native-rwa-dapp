/**
 * Operator client + environment configuration for the issuer tooling.
 *
 * `loadConfig` is PURE — it validates a plain env object and never touches the
 * network, so it is unit-tested directly. `createOperatorClient` builds the
 * `@hashgraph/sdk` Client and parses the ECDSA operator key; `Client.forName` and
 * `setOperator` do no network I/O, so it is offline-constructable too.
 *
 * The operator key lives in `.env` and must never be logged (CLAUDE.md / ADR-0003).
 */

import { z } from 'zod';
import { Client, PrivateKey } from '@hashgraph/sdk';
import type { PublicKey } from '@hashgraph/sdk';
import { ENTITY_ID_RE } from '../core/index.js';

export interface Config {
  operatorId: string;
  operatorKey: string;
  network: 'testnet' | 'mainnet' | 'previewnet';
  mirrorNodeUrl: string;
}

export interface OperatorContext {
  client: Client;
  operatorId: string;
  operatorKey: PrivateKey;
  operatorPublicKey: PublicKey;
  config: Config;
}

const DEFAULT_MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

const isUrl = (s: string): boolean => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

const EnvSchema = z.object({
  OPERATOR_ID: z
    .string()
    .regex(ENTITY_ID_RE, 'must be a shard.realm.num account id (e.g. 0.0.1001)'),
  OPERATOR_KEY: z.string().min(1, 'is required'),
  HEDERA_NETWORK: z.enum(['testnet', 'mainnet', 'previewnet']).default('testnet'),
  MIRROR_NODE_URL: z.string().refine(isUrl, 'must be a valid URL').default(DEFAULT_MIRROR_NODE_URL),
});

/**
 * Validate the environment and return a typed Config. Pure: reads only the passed
 * env object (defaults to `process.env`). Throws ONE clear error naming every
 * missing/invalid variable.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(env)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${details}`);
  }
  const e = parsed.data;
  return {
    operatorId: e.OPERATOR_ID,
    operatorKey: e.OPERATOR_KEY,
    network: e.HEDERA_NETWORK,
    mirrorNodeUrl: e.MIRROR_NODE_URL,
  };
}

/** Build the operator Client from a validated Config. No network I/O. */
export function createOperatorClient(config: Config): OperatorContext {
  const operatorKey = PrivateKey.fromStringECDSA(config.operatorKey);
  const client = Client.forName(config.network).setOperator(config.operatorId, operatorKey);
  return {
    client,
    operatorId: config.operatorId,
    operatorKey,
    operatorPublicKey: operatorKey.publicKey,
    config,
  };
}
