/**
 * Unit tests for src/sdk/operations/freeze.ts
 *   buildFreezeTransaction
 *   buildUnfreezeTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TokenFreezeTransaction: tokenId (.toString()), accountId (.toString())
 *   TokenUnfreezeTransaction: tokenId (.toString()), accountId (.toString())
 */

import { describe, it, expect } from 'vitest';
import {
  buildFreezeTransaction,
  buildUnfreezeTransaction,
} from '../../../../src/sdk/operations/freeze.js';
import type { TokenAccountArgs } from '../../../../src/core/tx/args.js';

const ARGS: TokenAccountArgs = { tokenId: '0.0.123456', accountId: '0.0.2002' };

// ---------------------------------------------------------------------------
// buildFreezeTransaction
// ---------------------------------------------------------------------------

describe('buildFreezeTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildFreezeTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('sets accountId from args', () => {
    const tx = buildFreezeTransaction(ARGS);
    expect(tx.accountId?.toString()).toBe('0.0.2002');
  });

  it('accepts different token and account ids', () => {
    const tx = buildFreezeTransaction({ tokenId: '0.0.5', accountId: '0.0.3003' });
    expect(tx.tokenId?.toString()).toBe('0.0.5');
    expect(tx.accountId?.toString()).toBe('0.0.3003');
  });
});

// ---------------------------------------------------------------------------
// buildUnfreezeTransaction
// ---------------------------------------------------------------------------

describe('buildUnfreezeTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildUnfreezeTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('sets accountId from args', () => {
    const tx = buildUnfreezeTransaction(ARGS);
    expect(tx.accountId?.toString()).toBe('0.0.2002');
  });

  it('accepts different token and account ids', () => {
    const tx = buildUnfreezeTransaction({ tokenId: '0.0.7', accountId: '0.0.4004' });
    expect(tx.tokenId?.toString()).toBe('0.0.7');
    expect(tx.accountId?.toString()).toBe('0.0.4004');
  });
});
