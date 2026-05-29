import { describe, it, expect } from 'vitest';
import {
  buildCreateTokenArgs,
  buildGrantKycArgs,
  buildRevokeKycArgs,
  buildMintArgs,
  buildWipeArgs,
  buildFreezeArgs,
  buildUnfreezeArgs,
  buildPauseArgs,
  buildUnpauseArgs,
  buildAssociateArgs,
  buildTransferArgs,
} from '../../../../src/core/tx/args.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validCreateInput() {
  return {
    name: 'Acme RWA',
    symbol: 'ARWA',
    decimals: 2,
    initialSupply: '0',
    treasuryAccountId: '0.0.1001',
    tokenType: 'FUNGIBLE_COMMON' as const,
    supplyType: 'FINITE' as const,
    maxSupply: '1000000',
    freezeDefault: false,
  };
}

// ---------------------------------------------------------------------------
// buildCreateTokenArgs
// ---------------------------------------------------------------------------

describe('buildCreateTokenArgs', () => {
  describe('happy path', () => {
    it('returns a valid TokenCreateArgs for a well-formed input', () => {
      const result = buildCreateTokenArgs(validCreateInput());
      expect(result.name).toBe('Acme RWA');
      expect(result.symbol).toBe('ARWA');
      expect(result.decimals).toBe(2);
      expect(result.initialSupply).toBe('0');
      expect(result.treasuryAccountId).toBe('0.0.1001');
      expect(result.tokenType).toBe('FUNGIBLE_COMMON');
      expect(result.supplyType).toBe('FINITE');
      expect(result.maxSupply).toBe('1000000');
      expect(result.freezeDefault).toBe(false);
    });

    it('defaults all six key flags to true when no keys input is provided', () => {
      const result = buildCreateTokenArgs(validCreateInput());
      expect(result.keys.admin).toBe(true);
      expect(result.keys.kyc).toBe(true);
      expect(result.keys.freeze).toBe(true);
      expect(result.keys.wipe).toBe(true);
      expect(result.keys.pause).toBe(true);
      expect(result.keys.supply).toBe(true);
    });

    it('accepts explicit key flags and returns them', () => {
      const result = buildCreateTokenArgs({
        ...validCreateInput(),
        keys: { admin: false, kyc: true, freeze: false, wipe: false, pause: true, supply: true },
      });
      expect(result.keys.admin).toBe(false);
      expect(result.keys.kyc).toBe(true);
    });

    it('accepts INFINITE supplyType with no maxSupply', () => {
      const result = buildCreateTokenArgs({
        ...validCreateInput(),
        supplyType: 'INFINITE' as const,
        maxSupply: undefined,
      });
      expect(result.supplyType).toBe('INFINITE');
    });

    it('accepts a large initialSupply string', () => {
      const result = buildCreateTokenArgs({ ...validCreateInput(), initialSupply: '999999999999' });
      expect(result.initialSupply).toBe('999999999999');
    });
  });

  describe('validation — throws on bad input', () => {
    it('throws when treasuryAccountId does not match shard.realm.num', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), treasuryAccountId: '0x1001' }),
      ).toThrow();
    });

    it('throws when treasuryAccountId is "abc"', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), treasuryAccountId: 'abc' }),
      ).toThrow();
    });

    it('throws when treasuryAccountId is "0.0"', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), treasuryAccountId: '0.0' }),
      ).toThrow();
    });

    it('throws when initialSupply is a number instead of a string', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), initialSupply: 1000 as unknown as string }),
      ).toThrow();
    });

    it('throws when supplyType is FINITE and maxSupply is omitted', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), supplyType: 'FINITE', maxSupply: undefined }),
      ).toThrow();
    });

    it('throws when maxSupply is a number instead of a string', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), maxSupply: 1000000 as unknown as string }),
      ).toThrow();
    });

    it('throws when decimals is a string instead of a number', () => {
      expect(() =>
        buildCreateTokenArgs({ ...validCreateInput(), decimals: '2' as unknown as number }),
      ).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// buildGrantKycArgs
// ---------------------------------------------------------------------------

describe('buildGrantKycArgs', () => {
  it('returns correct shape for valid IDs', () => {
    const result = buildGrantKycArgs({ tokenId: '0.0.123456', accountId: '0.0.2002' });
    expect(result).toEqual({ tokenId: '0.0.123456', accountId: '0.0.2002' });
  });

  it('throws when tokenId does not match shard.realm.num', () => {
    expect(() => buildGrantKycArgs({ tokenId: '0x1234', accountId: '0.0.2002' })).toThrow();
  });

  it('throws when accountId does not match shard.realm.num', () => {
    expect(() => buildGrantKycArgs({ tokenId: '0.0.123456', accountId: 'not-valid' })).toThrow();
  });

  it('throws when accountId is "0.0" (incomplete)', () => {
    expect(() => buildGrantKycArgs({ tokenId: '0.0.123456', accountId: '0.0' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildRevokeKycArgs
// ---------------------------------------------------------------------------

describe('buildRevokeKycArgs', () => {
  it('returns correct shape for valid IDs', () => {
    const result = buildRevokeKycArgs({ tokenId: '0.0.123456', accountId: '0.0.2002' });
    expect(result).toEqual({ tokenId: '0.0.123456', accountId: '0.0.2002' });
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildRevokeKycArgs({ tokenId: 'abc', accountId: '0.0.2002' })).toThrow();
  });

  it('throws when accountId is invalid', () => {
    expect(() => buildRevokeKycArgs({ tokenId: '0.0.1', accountId: 'bad' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildMintArgs
// ---------------------------------------------------------------------------

describe('buildMintArgs', () => {
  it('returns correct shape for valid input', () => {
    const result = buildMintArgs({ tokenId: '0.0.123456', amount: '5000' });
    expect(result).toEqual({ tokenId: '0.0.123456', amount: '5000' });
  });

  it('accepts a uint64-max amount string and preserves it exactly', () => {
    const result = buildMintArgs({ tokenId: '0.0.1', amount: '18446744073709551615' });
    expect(result.amount).toBe('18446744073709551615');
  });

  it('throws when amount is "0"', () => {
    expect(() => buildMintArgs({ tokenId: '0.0.1', amount: '0' })).toThrow();
  });

  it('throws when amount is a negative string', () => {
    expect(() => buildMintArgs({ tokenId: '0.0.1', amount: '-1' })).toThrow();
  });

  it('throws when amount is a decimal string', () => {
    expect(() => buildMintArgs({ tokenId: '0.0.1', amount: '1.5' })).toThrow();
  });

  it('throws when amount is a number type instead of string', () => {
    expect(() => buildMintArgs({ tokenId: '0.0.1', amount: 1000 as unknown as string })).toThrow();
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildMintArgs({ tokenId: 'invalid', amount: '100' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildWipeArgs
// ---------------------------------------------------------------------------

describe('buildWipeArgs', () => {
  it('returns correct shape for valid input', () => {
    const result = buildWipeArgs({ tokenId: '0.0.123456', accountId: '0.0.2002', amount: '100' });
    expect(result).toEqual({ tokenId: '0.0.123456', accountId: '0.0.2002', amount: '100' });
  });

  it('accepts a large amount string and preserves it', () => {
    const result = buildWipeArgs({
      tokenId: '0.0.1',
      accountId: '0.0.2',
      amount: '9007199254740993',
    });
    expect(result.amount).toBe('9007199254740993');
  });

  it('throws when amount is "0"', () => {
    expect(() => buildWipeArgs({ tokenId: '0.0.1', accountId: '0.0.2', amount: '0' })).toThrow();
  });

  it('throws when amount is negative', () => {
    expect(() => buildWipeArgs({ tokenId: '0.0.1', accountId: '0.0.2', amount: '-5' })).toThrow();
  });

  it('throws when amount is a number type', () => {
    expect(() =>
      buildWipeArgs({ tokenId: '0.0.1', accountId: '0.0.2', amount: 100 as unknown as string }),
    ).toThrow();
  });

  it('throws when accountId is invalid', () => {
    expect(() => buildWipeArgs({ tokenId: '0.0.1', accountId: 'bad-id', amount: '100' })).toThrow();
  });

  it('throws when tokenId is invalid', () => {
    expect(() =>
      buildWipeArgs({ tokenId: 'not-valid', accountId: '0.0.2', amount: '100' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildFreezeArgs
// ---------------------------------------------------------------------------

describe('buildFreezeArgs', () => {
  it('returns correct shape for valid input', () => {
    const result = buildFreezeArgs({ tokenId: '0.0.123456', accountId: '0.0.2002' });
    expect(result).toEqual({ tokenId: '0.0.123456', accountId: '0.0.2002' });
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildFreezeArgs({ tokenId: 'bad', accountId: '0.0.2002' })).toThrow();
  });

  it('throws when accountId is invalid', () => {
    expect(() => buildFreezeArgs({ tokenId: '0.0.1', accountId: 'bad' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildUnfreezeArgs
// ---------------------------------------------------------------------------

describe('buildUnfreezeArgs', () => {
  it('returns correct shape for valid input', () => {
    const result = buildUnfreezeArgs({ tokenId: '0.0.123456', accountId: '0.0.2002' });
    expect(result).toEqual({ tokenId: '0.0.123456', accountId: '0.0.2002' });
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildUnfreezeArgs({ tokenId: '0x1', accountId: '0.0.2002' })).toThrow();
  });

  it('throws when accountId is invalid', () => {
    expect(() => buildUnfreezeArgs({ tokenId: '0.0.1', accountId: '0x2002' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildPauseArgs
// ---------------------------------------------------------------------------

describe('buildPauseArgs', () => {
  it('returns correct shape for a valid tokenId', () => {
    const result = buildPauseArgs({ tokenId: '0.0.123456' });
    expect(result).toEqual({ tokenId: '0.0.123456' });
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildPauseArgs({ tokenId: 'not-valid' })).toThrow();
  });

  it('throws when tokenId is empty', () => {
    expect(() => buildPauseArgs({ tokenId: '' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildUnpauseArgs
// ---------------------------------------------------------------------------

describe('buildUnpauseArgs', () => {
  it('returns correct shape for a valid tokenId', () => {
    const result = buildUnpauseArgs({ tokenId: '0.0.123456' });
    expect(result).toEqual({ tokenId: '0.0.123456' });
  });

  it('throws when tokenId is invalid', () => {
    expect(() => buildUnpauseArgs({ tokenId: 'bad' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildAssociateArgs
// ---------------------------------------------------------------------------

describe('buildAssociateArgs', () => {
  it('returns correct shape for valid accountId and tokenId', () => {
    const result = buildAssociateArgs({ accountId: '0.0.2002', tokenId: '0.0.123456' });
    expect(result).toEqual({ accountId: '0.0.2002', tokenId: '0.0.123456' });
  });

  it('throws when accountId is "0x1"', () => {
    expect(() => buildAssociateArgs({ accountId: '0x1', tokenId: '0.0.123456' })).toThrow();
  });

  it('throws when accountId is "abc"', () => {
    expect(() => buildAssociateArgs({ accountId: 'abc', tokenId: '0.0.123456' })).toThrow();
  });

  it('throws when accountId is "0.0" (incomplete)', () => {
    expect(() => buildAssociateArgs({ accountId: '0.0', tokenId: '0.0.123456' })).toThrow();
  });

  it('throws when tokenId is "0x1"', () => {
    expect(() => buildAssociateArgs({ accountId: '0.0.2002', tokenId: '0x1' })).toThrow();
  });

  it('throws when tokenId is "abc"', () => {
    expect(() => buildAssociateArgs({ accountId: '0.0.2002', tokenId: 'abc' })).toThrow();
  });

  it('throws when tokenId is "0.0" (incomplete)', () => {
    expect(() => buildAssociateArgs({ accountId: '0.0.2002', tokenId: '0.0' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildTransferArgs
// ---------------------------------------------------------------------------

describe('buildTransferArgs', () => {
  it('returns correct shape for valid input', () => {
    const result = buildTransferArgs({
      tokenId: '0.0.123456',
      fromAccountId: '0.0.1001',
      toAccountId: '0.0.2002',
      amount: '5000',
    });
    expect(result).toEqual({
      tokenId: '0.0.123456',
      fromAccountId: '0.0.1001',
      toAccountId: '0.0.2002',
      amount: '5000',
    });
  });

  it('accepts a large within-int64 amount string and preserves it exactly', () => {
    const result = buildTransferArgs({
      tokenId: '0.0.1',
      fromAccountId: '0.0.2',
      toAccountId: '0.0.3',
      amount: '9007199254740993',
    });
    expect(result.amount).toBe('9007199254740993');
  });

  it('throws when fromAccountId is invalid', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.123456',
        fromAccountId: '0x1001',
        toAccountId: '0.0.2002',
        amount: '100',
      }),
    ).toThrow();
  });

  it('throws when toAccountId is invalid', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.123456',
        fromAccountId: '0.0.1001',
        toAccountId: 'not-valid',
        amount: '100',
      }),
    ).toThrow();
  });

  it('throws when tokenId is invalid', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: 'bad-token',
        fromAccountId: '0.0.1001',
        toAccountId: '0.0.2002',
        amount: '100',
      }),
    ).toThrow();
  });

  it('throws when amount is "0"', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.1',
        fromAccountId: '0.0.2',
        toAccountId: '0.0.3',
        amount: '0',
      }),
    ).toThrow();
  });

  it('throws when amount is negative "-1"', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.1',
        fromAccountId: '0.0.2',
        toAccountId: '0.0.3',
        amount: '-1',
      }),
    ).toThrow();
  });

  it('throws when amount is a decimal "1.5"', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.1',
        fromAccountId: '0.0.2',
        toAccountId: '0.0.3',
        amount: '1.5',
      }),
    ).toThrow();
  });

  it('throws when amount is a number type instead of a string', () => {
    expect(() =>
      buildTransferArgs({
        tokenId: '0.0.1',
        fromAccountId: '0.0.2',
        toAccountId: '0.0.3',
        amount: 500 as unknown as string,
      }),
    ).toThrow();
  });
});
