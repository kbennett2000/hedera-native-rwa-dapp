/**
 * Unit tests for src/sdk/operations/supply.ts — buildMintTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TokenMintTransaction: tokenId (.toString()), amount (Long — .toString())
 *
 * ADR-0007 int64 guard: amounts marshal to a checked Long; Long.fromString silently
 * wraps on overflow (e.g. '9223372036854775808' → '-9223372036854775808'), so the
 * builder MUST throw explicitly rather than pass a wrapped value to the network.
 */

import { describe, it, expect } from 'vitest';
import { buildMintTransaction } from '../../../../src/sdk/operations/supply.js';
import type { MintArgs } from '../../../../src/core/tx/args.js';

// ---------------------------------------------------------------------------
// buildMintTransaction — field marshalling
// ---------------------------------------------------------------------------

describe('buildMintTransaction', () => {
  it('sets tokenId from args', () => {
    const args: MintArgs = { tokenId: '0.0.1001', amount: '1000' };
    const tx = buildMintTransaction(args);
    expect(tx.tokenId?.toString()).toBe('0.0.1001');
  });

  it('sets amount as a Long with the correct value', () => {
    const args: MintArgs = { tokenId: '0.0.1001', amount: '500' };
    const tx = buildMintTransaction(args);
    expect(tx.amount?.toString()).toBe('500');
  });

  it('preserves a large amount within int64 range exactly (9007199254740993)', () => {
    // This value is > Number.MAX_SAFE_INTEGER but within signed int64 max
    const SAFE_LARGE = '9007199254740993';
    const tx = buildMintTransaction({ tokenId: '0.0.1', amount: SAFE_LARGE });
    expect(tx.amount?.toString()).toBe(SAFE_LARGE);
  });

  it('preserves int64-max (9223372036854775807) exactly', () => {
    const INT64_MAX = '9223372036854775807';
    const tx = buildMintTransaction({ tokenId: '0.0.1', amount: INT64_MAX });
    expect(tx.amount?.toString()).toBe(INT64_MAX);
  });

  // ADR-0007: int64 overflow guard — must throw, not silently wrap
  it('throws when amount exceeds signed int64 max (9223372036854775808)', () => {
    expect(() =>
      buildMintTransaction({ tokenId: '0.0.1', amount: '9223372036854775808' }),
    ).toThrow();
  });

  it('throws when amount is well above int64 max', () => {
    expect(() =>
      buildMintTransaction({ tokenId: '0.0.1', amount: '99999999999999999999' }),
    ).toThrow();
  });
});
