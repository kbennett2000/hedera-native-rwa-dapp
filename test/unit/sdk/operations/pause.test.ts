/**
 * Unit tests for src/sdk/operations/pause.ts
 *   buildPauseTransaction
 *   buildUnpauseTransaction
 *
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   TokenPauseTransaction: tokenId (.toString())
 *   TokenUnpauseTransaction: tokenId (.toString())
 */

import { describe, it, expect } from 'vitest';
import {
  buildPauseTransaction,
  buildUnpauseTransaction,
} from '../../../../src/sdk/operations/pause.js';
import type { TokenOnlyArgs } from '../../../../src/core/tx/args.js';

const ARGS: TokenOnlyArgs = { tokenId: '0.0.123456' };

// ---------------------------------------------------------------------------
// buildPauseTransaction
// ---------------------------------------------------------------------------

describe('buildPauseTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildPauseTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('accepts a different token id', () => {
    const tx = buildPauseTransaction({ tokenId: '0.0.9999' });
    expect(tx.tokenId?.toString()).toBe('0.0.9999');
  });
});

// ---------------------------------------------------------------------------
// buildUnpauseTransaction
// ---------------------------------------------------------------------------

describe('buildUnpauseTransaction', () => {
  it('sets tokenId from args', () => {
    const tx = buildUnpauseTransaction(ARGS);
    expect(tx.tokenId?.toString()).toBe('0.0.123456');
  });

  it('accepts a different token id', () => {
    const tx = buildUnpauseTransaction({ tokenId: '0.0.8888' });
    expect(tx.tokenId?.toString()).toBe('0.0.8888');
  });
});
