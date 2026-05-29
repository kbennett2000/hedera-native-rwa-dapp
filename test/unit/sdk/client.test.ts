/**
 * Unit tests for src/sdk/client.ts
 *
 * loadConfig is pure (takes env as a plain object) — no real process.env.
 * createOperatorClient is offline — Client.forName + setOperator do not hit the network.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PrivateKey } from '@hashgraph/sdk';
import type { Config } from '../../../src/sdk/client.js';
import { loadConfig, createOperatorClient } from '../../../src/sdk/client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a fresh ECDSA private key in raw-hex form for each test that needs one. */
function freshEcdsaRawKey(): string {
  return PrivateKey.generateECDSA().toStringRaw();
}

function validEnv(overrides?: Partial<Record<string, string>>): Record<string, string> {
  return {
    OPERATOR_ID: '0.0.1001',
    OPERATOR_KEY: freshEcdsaRawKey(),
    HEDERA_NETWORK: 'testnet',
    MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// loadConfig — happy path
// ---------------------------------------------------------------------------

describe('loadConfig', () => {
  describe('valid env', () => {
    it('returns a Config with all provided values', () => {
      const key = freshEcdsaRawKey();
      const env = {
        OPERATOR_ID: '0.0.1001',
        OPERATOR_KEY: key,
        HEDERA_NETWORK: 'testnet',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
      };
      const config = loadConfig(env);
      expect(config.operatorId).toBe('0.0.1001');
      expect(config.operatorKey).toBe(key);
      expect(config.network).toBe('testnet');
      expect(config.mirrorNodeUrl).toBe('https://testnet.mirrornode.hedera.com');
    });

    it('accepts mainnet as a valid network', () => {
      const config = loadConfig(validEnv({ HEDERA_NETWORK: 'mainnet' }));
      expect(config.network).toBe('mainnet');
    });

    it('accepts previewnet as a valid network', () => {
      const config = loadConfig(validEnv({ HEDERA_NETWORK: 'previewnet' }));
      expect(config.network).toBe('previewnet');
    });
  });

  // ---------------------------------------------------------------------------
  // loadConfig — defaults
  // ---------------------------------------------------------------------------

  describe('defaults', () => {
    it('defaults to testnet when HEDERA_NETWORK is absent', () => {
      const env: Record<string, string> = {
        OPERATOR_ID: '0.0.1001',
        OPERATOR_KEY: freshEcdsaRawKey(),
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
      };
      const config = loadConfig(env);
      expect(config.network).toBe('testnet');
    });

    it('defaults MIRROR_NODE_URL to the testnet Mirror Node when absent', () => {
      const env: Record<string, string> = {
        OPERATOR_ID: '0.0.1001',
        OPERATOR_KEY: freshEcdsaRawKey(),
        HEDERA_NETWORK: 'testnet',
      };
      const config = loadConfig(env);
      expect(config.mirrorNodeUrl).toBe('https://testnet.mirrornode.hedera.com');
    });
  });

  // ---------------------------------------------------------------------------
  // loadConfig — missing required fields
  // ---------------------------------------------------------------------------

  describe('missing required fields', () => {
    it('throws when OPERATOR_ID is absent, mentioning OPERATOR_ID', () => {
      const env: Record<string, string> = { OPERATOR_KEY: freshEcdsaRawKey() };
      expect(() => loadConfig(env)).toThrow(/OPERATOR_ID/);
    });

    it('throws when OPERATOR_KEY is absent, mentioning OPERATOR_KEY', () => {
      const env: Record<string, string> = { OPERATOR_ID: '0.0.1001' };
      expect(() => loadConfig(env)).toThrow(/OPERATOR_KEY/);
    });

    it('throws when both OPERATOR_ID and OPERATOR_KEY are absent', () => {
      expect(() => loadConfig({})).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // loadConfig — invalid field values
  // ---------------------------------------------------------------------------

  describe('invalid OPERATOR_ID', () => {
    it('throws when OPERATOR_ID is not an entity-id (e.g. 0x1001)', () => {
      expect(() => loadConfig(validEnv({ OPERATOR_ID: '0x1001' }))).toThrow();
    });

    it('throws when OPERATOR_ID is a plain number string', () => {
      expect(() => loadConfig(validEnv({ OPERATOR_ID: '1001' }))).toThrow();
    });

    it('throws when OPERATOR_ID has wrong segment count', () => {
      expect(() => loadConfig(validEnv({ OPERATOR_ID: '0.1001' }))).toThrow();
    });
  });

  describe('invalid HEDERA_NETWORK', () => {
    it('throws when HEDERA_NETWORK is not a valid network name, mentioning HEDERA_NETWORK', () => {
      expect(() => loadConfig(validEnv({ HEDERA_NETWORK: 'notanet' }))).toThrow();
    });

    it('throws when HEDERA_NETWORK is an empty string', () => {
      expect(() => loadConfig(validEnv({ HEDERA_NETWORK: '' }))).toThrow();
    });
  });

  describe('invalid MIRROR_NODE_URL', () => {
    it('throws when MIRROR_NODE_URL is not a valid URL', () => {
      expect(() => loadConfig(validEnv({ MIRROR_NODE_URL: 'not a url' }))).toThrow();
    });

    it('throws when MIRROR_NODE_URL is a bare hostname without scheme', () => {
      expect(() =>
        loadConfig(validEnv({ MIRROR_NODE_URL: 'testnet.mirrornode.hedera.com' })),
      ).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// createOperatorClient — offline (no network calls)
// ---------------------------------------------------------------------------

describe('createOperatorClient', () => {
  const clients: import('@hashgraph/sdk').Client[] = [];

  afterEach(() => {
    // Close any clients created in tests to avoid open handles
    for (const client of clients) {
      try {
        client.close();
      } catch {
        // ignore close errors
      }
    }
    clients.length = 0;
  });

  function buildConfig(overrides?: Partial<Config>): Config {
    return {
      operatorId: '0.0.1001',
      operatorKey: freshEcdsaRawKey(),
      network: 'testnet',
      mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
      ...overrides,
    };
  }

  it('returns an object with client defined', () => {
    const config = buildConfig();
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.client).toBeDefined();
  });

  it('returns operatorPublicKey defined', () => {
    const config = buildConfig();
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.operatorPublicKey).toBeDefined();
  });

  it('returns operatorId matching the config operatorId', () => {
    const config = buildConfig({ operatorId: '0.0.1001' });
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.operatorId).toBe('0.0.1001');
  });

  it('exposes the operatorKey as a PrivateKey instance', () => {
    const rawKey = freshEcdsaRawKey();
    const config = buildConfig({ operatorKey: rawKey });
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    // The returned operatorKey should produce the same public key as the raw string round-trip
    const expectedPub = PrivateKey.fromStringECDSA(rawKey).publicKey;
    expect(ctx.operatorPublicKey.toString()).toBe(expectedPub.toString());
  });

  it('works with a testnet config', () => {
    const config = buildConfig({ network: 'testnet' });
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.client).toBeDefined();
  });

  it('works with a mainnet config', () => {
    const config = buildConfig({ network: 'mainnet' });
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.client).toBeDefined();
  });

  it('works with a previewnet config', () => {
    const config = buildConfig({ network: 'previewnet' });
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.client).toBeDefined();
  });

  it('returns the config on the context', () => {
    const config = buildConfig();
    const ctx = createOperatorClient(config);
    clients.push(ctx.client);
    expect(ctx.config).toStrictEqual(config);
  });
});
