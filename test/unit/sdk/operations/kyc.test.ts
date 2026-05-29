/**
 * Unit tests for src/sdk/operations/kyc.ts
 *   buildGrantKycTransaction
 *   buildRevokeKycTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TokenGrantKycTransaction: tokenId (.toString()), accountId (.toString())
 *   TokenRevokeKycTransaction: tokenId (.toString()), accountId (.toString())
 */

import { describe, it, expect } from 'vitest';
import {
  buildGrantKycTransaction,
  buildRevokeKycTransaction,
} from '../../../../src/sdk/operations/kyc.js';
import type { TokenAccountArgs } from '../../../../src/core/tx/args.js';

const ARGS: TokenAccountArgs = { tokenId: '0.0.123456', accountId: '0.0.2002' };

// ---------------------------------------------------------------------------
// buildGrantKycTransaction
// ---------------------------------------------------------------------------

describe('buildGrantKycTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildGrantKycTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('sets accountId from args', () => {
    const tx = buildGrantKycTransaction(ARGS);
    expect(tx.accountId?.toString()).toBe('0.0.2002');
  });

  it('accepts different token and account ids', () => {
    const tx = buildGrantKycTransaction({ tokenId: '0.0.9999', accountId: '0.0.1111' });
    expect(tx.tokenId?.toString()).toBe('0.0.9999');
    expect(tx.accountId?.toString()).toBe('0.0.1111');
  });
});

// ---------------------------------------------------------------------------
// buildRevokeKycTransaction
// ---------------------------------------------------------------------------

describe('buildRevokeKycTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildRevokeKycTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('sets accountId from args', () => {
    const tx = buildRevokeKycTransaction(ARGS);
    expect(tx.accountId?.toString()).toBe('0.0.2002');
  });

  it('accepts different token and account ids', () => {
    const tx = buildRevokeKycTransaction({ tokenId: '0.0.9999', accountId: '0.0.3333' });
    expect(tx.tokenId?.toString()).toBe('0.0.9999');
    expect(tx.accountId?.toString()).toBe('0.0.3333');
  });
});
