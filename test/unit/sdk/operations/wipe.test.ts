/**
 * Unit tests for src/sdk/operations/wipe.ts — buildWipeTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TokenWipeTransaction: tokenId (.toString()), accountId (.toString()),
 *     amount (Long — .toString())
 *
 * ADR-0007 int64 guard: same overflow protection as buildMintTransaction.
 */

import { describe, it, expect } from 'vitest';
import { buildWipeTransaction } from '../../../../src/sdk/operations/wipe.js';
import type { WipeArgs } from '../../../../src/core/tx/args.js';

const BASE_ARGS: WipeArgs = { tokenId: '0.0.123456', accountId: '0.0.2002', amount: '500' };

// ---------------------------------------------------------------------------
// buildWipeTransaction — field marshalling
// ---------------------------------------------------------------------------

describe('buildWipeTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildWipeTransaction(BASE_ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('sets accountId from args', () => {
    const tx = buildWipeTransaction(BASE_ARGS);
    expect(tx.accountId?.toString()).toBe('0.0.2002');
  });

  it('sets amount as a Long with the correct value', () => {
    const tx = buildWipeTransaction(BASE_ARGS);
    expect(tx.amount?.toString()).toBe('500');
  });

  it('preserves a large amount within int64 range exactly (9007199254740993)', () => {
    const SAFE_LARGE = '9007199254740993';
    const tx = buildWipeTransaction({ ...BASE_ARGS, amount: SAFE_LARGE });
    expect(tx.amount?.toString()).toBe(SAFE_LARGE);
  });

  it('preserves int64-max (9223372036854775807) exactly', () => {
    const INT64_MAX = '9223372036854775807';
    const tx = buildWipeTransaction({ ...BASE_ARGS, amount: INT64_MAX });
    expect(tx.amount?.toString()).toBe(INT64_MAX);
  });

  // ADR-0007: int64 overflow guard — must throw, not silently wrap
  it('throws when amount exceeds signed int64 max (9223372036854775808)', () => {
    expect(() => buildWipeTransaction({ ...BASE_ARGS, amount: '9223372036854775808' })).toThrow();
  });

  it('throws when amount is well above int64 max', () => {
    expect(() => buildWipeTransaction({ ...BASE_ARGS, amount: '18446744073709551615' })).toThrow();
  });
});
