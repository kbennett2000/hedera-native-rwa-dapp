/**
 * Unit tests for src/sdk/operations/token.ts — buildCreateTokenTransaction
 *
 * These test that the builder correctly marshals core TokenCreateArgs into a
 * TokenCreateTransaction with the right field values and key bindings.
 * No network. No execute().
 *
 * Verified SDK getters (introspected 2026-05-29):
 *   tokenName, tokenSymbol, decimals (Long — compare via .toString()),
 *   initialSupply (Long — .toString()), maxSupply (Long — .toString()),
 *   treasuryAccountId (.toString()), tokenType (=== TokenType.FungibleCommon),
 *   supplyType (=== TokenSupplyType.Finite / .Infinite),
 *   freezeDefault (boolean | null),
 *   adminKey/kycKey/freezeKey/wipeKey/pauseKey/supplyKey (.toString() or null when unset)
 */

import { describe, it, expect } from 'vitest';
import { PrivateKey, TokenType, TokenSupplyType } from '@hashgraph/sdk';
import { buildCreateTokenArgs } from '../../../../src/core/tx/args.js';
import { buildCreateTokenTransaction } from '../../../../src/sdk/operations/token.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const operatorKey = PrivateKey.generateECDSA();
const operatorPublicKey = operatorKey.publicKey;

function fullCreateInput() {
  return buildCreateTokenArgs({
    name: 'Acme RWA',
    symbol: 'ARWA',
    decimals: 2,
    initialSupply: '0',
    treasuryAccountId: '0.0.1001',
    tokenType: 'FUNGIBLE_COMMON',
    supplyType: 'FINITE',
    maxSupply: '1000000',
    freezeDefault: false,
    keys: { admin: true, kyc: true, freeze: true, wipe: true, pause: true, supply: true },
  });
}

// ---------------------------------------------------------------------------
// Basic field marshalling
// ---------------------------------------------------------------------------

describe('buildCreateTokenTransaction — basic fields', () => {
  it('sets tokenName from args', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.tokenName).toBe('Acme RWA');
  });

  it('sets tokenSymbol from args', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.tokenSymbol).toBe('ARWA');
  });

  it('sets decimals from args (Long.toString() === decimals string)', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.decimals?.toString()).toBe('2');
  });

  it('sets initialSupply as Long matching the arg string', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.initialSupply?.toString()).toBe('0');
  });

  it('sets maxSupply as Long matching the arg string', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.maxSupply?.toString()).toBe('1000000');
  });

  it('sets treasuryAccountId from args', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.treasuryAccountId?.toString()).toBe('0.0.1001');
  });

  it('sets tokenType to FungibleCommon', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.tokenType).toBe(TokenType.FungibleCommon);
  });

  it('sets supplyType to Finite when args say FINITE', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.supplyType).toBe(TokenSupplyType.Finite);
  });

  it('sets supplyType to Infinite when args say INFINITE', () => {
    const infiniteArgs = buildCreateTokenArgs({
      name: 'Test',
      symbol: 'T',
      decimals: 0,
      initialSupply: '0',
      treasuryAccountId: '0.0.1001',
      tokenType: 'FUNGIBLE_COMMON',
      supplyType: 'INFINITE',
      freezeDefault: false,
    });
    const tx = buildCreateTokenTransaction(infiniteArgs, operatorPublicKey);
    expect(tx.supplyType).toBe(TokenSupplyType.Infinite);
  });

  it('sets freezeDefault from args', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.freezeDefault).toBe(false);
  });

  it('sets freezeDefault=true when args specify it', () => {
    const args = buildCreateTokenArgs({
      name: 'Test',
      symbol: 'T',
      decimals: 0,
      initialSupply: '0',
      treasuryAccountId: '0.0.1001',
      tokenType: 'FUNGIBLE_COMMON',
      supplyType: 'INFINITE',
      freezeDefault: true,
    });
    const tx = buildCreateTokenTransaction(args, operatorPublicKey);
    expect(tx.freezeDefault).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Key binding — all keys enabled
// ---------------------------------------------------------------------------

describe('buildCreateTokenTransaction — key binding (all keys true)', () => {
  it('sets adminKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.adminKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets kycKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.kycKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets freezeKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.freezeKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets wipeKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.wipeKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets pauseKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.pauseKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets supplyKey to the operator public key', () => {
    const tx = buildCreateTokenTransaction(fullCreateInput(), operatorPublicKey);
    expect(tx.supplyKey?.toString()).toBe(operatorPublicKey.toString());
  });
});

// ---------------------------------------------------------------------------
// Key binding — selective keys
// ---------------------------------------------------------------------------

describe('buildCreateTokenTransaction — key binding (selective keys)', () => {
  // admin=true, kyc=true, freeze=false, wipe=false, pause=false, supply=true
  function selectiveArgs() {
    return buildCreateTokenArgs({
      name: 'Selective',
      symbol: 'SEL',
      decimals: 0,
      initialSupply: '0',
      treasuryAccountId: '0.0.1001',
      tokenType: 'FUNGIBLE_COMMON',
      supplyType: 'INFINITE',
      freezeDefault: false,
      keys: { admin: true, kyc: true, freeze: false, wipe: false, pause: false, supply: true },
    });
  }

  it('sets adminKey when admin=true', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.adminKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets kycKey when kyc=true', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.kycKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('sets supplyKey when supply=true', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.supplyKey?.toString()).toBe(operatorPublicKey.toString());
  });

  it('freezeKey is null when freeze=false', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.freezeKey).toBeNull();
  });

  it('wipeKey is null when wipe=false', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.wipeKey).toBeNull();
  });

  it('pauseKey is null when pause=false', () => {
    const tx = buildCreateTokenTransaction(selectiveArgs(), operatorPublicKey);
    expect(tx.pauseKey).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Supply-type / maxSupply guard (HTS rejects maxSupply on INFINITE supply)
// ---------------------------------------------------------------------------

describe('buildCreateTokenTransaction — INFINITE supply guard', () => {
  it('throws when supplyType is INFINITE but maxSupply is set', () => {
    const args = buildCreateTokenArgs({
      name: 'Infinite',
      symbol: 'INF',
      decimals: 0,
      initialSupply: '0',
      treasuryAccountId: '0.0.1001',
      tokenType: 'FUNGIBLE_COMMON',
      supplyType: 'INFINITE',
      maxSupply: '1000',
      freezeDefault: false,
    });
    expect(() => buildCreateTokenTransaction(args, operatorPublicKey)).toThrow(/INFINITE/);
  });
});
