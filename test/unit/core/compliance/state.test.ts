import { describe, it, expect } from 'vitest';
import { deriveComplianceState } from '../../../../src/core/compliance/state.js';
import type { AccountTokenRelationship } from '../../../../src/core/mirror/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relationship(overrides: Partial<AccountTokenRelationship> = {}): AccountTokenRelationship {
  return {
    tokenId: '0.0.123456',
    balance: '1000',
    kycStatus: 'GRANTED',
    freezeStatus: 'UNFROZEN',
    automaticAssociation: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Truth table tests
// ---------------------------------------------------------------------------

describe('deriveComplianceState', () => {
  describe('fully compliant account', () => {
    it('returns all positive flags when KYC granted, unfrozen, token not paused', () => {
      const state = deriveComplianceState({
        relationship: relationship(),
        tokenPaused: false,
      });
      expect(state.associated).toBe(true);
      expect(state.kycGranted).toBe(true);
      expect(state.frozen).toBe(false);
      expect(state.tokenPaused).toBe(false);
      expect(state.canReceive).toBe(true);
      expect(state.canSend).toBe(true);
    });
  });

  describe('no relationship (not associated)', () => {
    it('returns associated false when relationship is undefined', () => {
      const state = deriveComplianceState({ relationship: undefined, tokenPaused: false });
      expect(state.associated).toBe(false);
    });

    it('returns canReceive false when relationship is undefined', () => {
      const state = deriveComplianceState({ relationship: undefined, tokenPaused: false });
      expect(state.canReceive).toBe(false);
    });

    it('returns canSend false when relationship is undefined', () => {
      const state = deriveComplianceState({ relationship: undefined, tokenPaused: false });
      expect(state.canSend).toBe(false);
    });

    it('returns associated false when relationship is null', () => {
      const state = deriveComplianceState({ relationship: null, tokenPaused: false });
      expect(state.associated).toBe(false);
    });

    it('returns canReceive false when relationship is null', () => {
      const state = deriveComplianceState({ relationship: null, tokenPaused: false });
      expect(state.canReceive).toBe(false);
    });

    it('returns canSend false when relationship is null', () => {
      const state = deriveComplianceState({ relationship: null, tokenPaused: false });
      expect(state.canSend).toBe(false);
    });
  });

  describe('KYC revoked', () => {
    it('returns kycGranted false when kycStatus is REVOKED', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'REVOKED' }),
        tokenPaused: false,
      });
      expect(state.kycGranted).toBe(false);
    });

    it('returns canReceive false when KYC is revoked', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'REVOKED' }),
        tokenPaused: false,
      });
      expect(state.canReceive).toBe(false);
    });

    it('returns canSend false when KYC is revoked', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'REVOKED' }),
        tokenPaused: false,
      });
      expect(state.canSend).toBe(false);
    });

    it('returns associated true even when KYC is revoked (account is still associated)', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'REVOKED' }),
        tokenPaused: false,
      });
      expect(state.associated).toBe(true);
    });
  });

  describe('frozen account', () => {
    it('returns frozen true when freezeStatus is FROZEN', () => {
      const state = deriveComplianceState({
        relationship: relationship({ freezeStatus: 'FROZEN' }),
        tokenPaused: false,
      });
      expect(state.frozen).toBe(true);
    });

    it('returns canReceive false when account is frozen', () => {
      const state = deriveComplianceState({
        relationship: relationship({ freezeStatus: 'FROZEN' }),
        tokenPaused: false,
      });
      expect(state.canReceive).toBe(false);
    });

    it('returns canSend false when account is frozen', () => {
      const state = deriveComplianceState({
        relationship: relationship({ freezeStatus: 'FROZEN' }),
        tokenPaused: false,
      });
      expect(state.canSend).toBe(false);
    });
  });

  describe('token paused', () => {
    it('returns tokenPaused true when tokenPaused input is true', () => {
      const state = deriveComplianceState({
        relationship: relationship(),
        tokenPaused: true,
      });
      expect(state.tokenPaused).toBe(true);
    });

    it('returns canReceive false when token is paused even if KYC granted and not frozen', () => {
      const state = deriveComplianceState({
        relationship: relationship(),
        tokenPaused: true,
      });
      expect(state.canReceive).toBe(false);
    });

    it('returns canSend false when token is paused even if KYC granted and not frozen', () => {
      const state = deriveComplianceState({
        relationship: relationship(),
        tokenPaused: true,
      });
      expect(state.canSend).toBe(false);
    });

    it('returns associated true when token is paused (association is unchanged)', () => {
      const state = deriveComplianceState({
        relationship: relationship(),
        tokenPaused: true,
      });
      expect(state.associated).toBe(true);
    });
  });

  describe('KYC NOT_APPLICABLE (token has no kycKey)', () => {
    it('returns kycGranted false when kycStatus is NOT_APPLICABLE', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'NOT_APPLICABLE' }),
        tokenPaused: false,
      });
      expect(state.kycGranted).toBe(false);
    });

    it('returns canReceive true when kycStatus is NOT_APPLICABLE and everything else is open', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'NOT_APPLICABLE' }),
        tokenPaused: false,
      });
      expect(state.canReceive).toBe(true);
    });

    it('returns canSend true when kycStatus is NOT_APPLICABLE and everything else is open', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'NOT_APPLICABLE' }),
        tokenPaused: false,
      });
      expect(state.canSend).toBe(true);
    });

    it('returns frozen false when freezeStatus is NOT_APPLICABLE', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'NOT_APPLICABLE', freezeStatus: 'NOT_APPLICABLE' }),
        tokenPaused: false,
      });
      expect(state.frozen).toBe(false);
    });
  });

  describe('combined blocking conditions', () => {
    it('frozen and token paused — canSend and canReceive are both false', () => {
      const state = deriveComplianceState({
        relationship: relationship({ freezeStatus: 'FROZEN' }),
        tokenPaused: true,
      });
      expect(state.canReceive).toBe(false);
      expect(state.canSend).toBe(false);
    });

    it('KYC revoked and frozen — canSend and canReceive are both false', () => {
      const state = deriveComplianceState({
        relationship: relationship({ kycStatus: 'REVOKED', freezeStatus: 'FROZEN' }),
        tokenPaused: false,
      });
      expect(state.canReceive).toBe(false);
      expect(state.canSend).toBe(false);
    });
  });
});
