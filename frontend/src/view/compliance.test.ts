import { describe, it, expect } from 'vitest';
import type { ComplianceState } from '@core';
import { statusBadges, transferBlockReason } from './compliance';
import type { Badge } from './compliance';

// ---------------------------------------------------------------------------
// Helpers — build ComplianceState literals directly (no network needed)
// ---------------------------------------------------------------------------

function fullyCompliant(): ComplianceState {
  return {
    associated: true,
    kycGranted: true,
    frozen: false,
    tokenPaused: false,
    canReceive: true,
    canSend: true,
  };
}

function notAssociated(): ComplianceState {
  return {
    associated: false,
    kycGranted: false,
    frozen: false,
    tokenPaused: false,
    canReceive: false,
    canSend: false,
  };
}

function frozenAccount(): ComplianceState {
  return {
    associated: true,
    kycGranted: true,
    frozen: true,
    tokenPaused: false,
    canReceive: false,
    canSend: false,
  };
}

function tokenPausedState(): ComplianceState {
  return {
    associated: true,
    kycGranted: true,
    frozen: false,
    tokenPaused: true,
    canReceive: false,
    canSend: false,
  };
}

function kycNotGranted(): ComplianceState {
  // associated, not frozen, not paused — but KYC missing (e.g. REVOKED)
  return {
    associated: true,
    kycGranted: false,
    frozen: false,
    tokenPaused: false,
    canReceive: false,
    canSend: false,
  };
}

// ---------------------------------------------------------------------------
// statusBadges
// ---------------------------------------------------------------------------

describe('statusBadges', () => {
  it('returns exactly 4 badges', () => {
    expect(statusBadges(fullyCompliant())).toHaveLength(4);
  });

  it('returns badges with stable keys: associated, kyc, frozen, canReceive', () => {
    const badges = statusBadges(fullyCompliant());
    const keys = badges.map((b: Badge) => b.key);
    expect(keys).toContain('associated');
    expect(keys).toContain('kyc');
    expect(keys).toContain('frozen');
    expect(keys).toContain('canReceive');
  });

  describe('fully compliant state — all ok', () => {
    it('associated badge has tone "ok" and label contains "Associated"', () => {
      const badges = statusBadges(fullyCompliant());
      const badge = badges.find((b: Badge) => b.key === 'associated');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('ok');
      expect(badge!.label).toMatch(/Associated/i);
    });

    it('kyc badge has tone "ok" and label contains "KYC"', () => {
      const badges = statusBadges(fullyCompliant());
      const badge = badges.find((b: Badge) => b.key === 'kyc');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('ok');
      expect(badge!.label).toMatch(/KYC/i);
    });

    it('frozen badge has tone "ok" and label indicates not frozen', () => {
      const badges = statusBadges(fullyCompliant());
      const badge = badges.find((b: Badge) => b.key === 'frozen');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('ok');
    });

    it('canReceive badge has tone "ok" and label contains "Receive"', () => {
      const badges = statusBadges(fullyCompliant());
      const badge = badges.find((b: Badge) => b.key === 'canReceive');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('ok');
      expect(badge!.label).toMatch(/Receive/i);
    });
  });

  describe('not-associated state', () => {
    it('associated badge has tone "neutral" when associated is false', () => {
      const badges = statusBadges(notAssociated());
      const badge = badges.find((b: Badge) => b.key === 'associated');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('neutral');
    });
  });

  describe('frozen state', () => {
    it('frozen badge has tone "bad" when account is frozen', () => {
      const badges = statusBadges(frozenAccount());
      const badge = badges.find((b: Badge) => b.key === 'frozen');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('bad');
    });
  });

  describe('cannot receive', () => {
    it('canReceive badge has tone "warn" when canReceive is false', () => {
      const badges = statusBadges(notAssociated());
      const badge = badges.find((b: Badge) => b.key === 'canReceive');
      expect(badge).toBeDefined();
      expect(badge!.tone).toBe('warn');
    });
  });
});

// ---------------------------------------------------------------------------
// transferBlockReason
// ---------------------------------------------------------------------------

describe('transferBlockReason', () => {
  it('returns null when recipient canReceive is true', () => {
    expect(transferBlockReason(fullyCompliant())).toBeNull();
  });

  it('matches /paused/i when token is paused (highest priority gate)', () => {
    const reason = transferBlockReason(tokenPausedState());
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/paused/i);
  });

  it('matches /associat/i when recipient is not associated (and token not paused)', () => {
    const reason = transferBlockReason(notAssociated());
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/associat/i);
  });

  it('matches /frozen/i when recipient is frozen (associated, not paused)', () => {
    const reason = transferBlockReason(frozenAccount());
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/frozen/i);
  });

  it('matches /kyc/i when associated, not frozen, not paused, but KYC not granted', () => {
    const reason = transferBlockReason(kycNotGranted());
    expect(reason).not.toBeNull();
    expect(reason).toMatch(/kyc/i);
  });

  it('token paused takes priority over not-associated', () => {
    const state: ComplianceState = {
      associated: false,
      kycGranted: false,
      frozen: false,
      tokenPaused: true,
      canReceive: false,
      canSend: false,
    };
    const reason = transferBlockReason(state);
    expect(reason).toMatch(/paused/i);
  });
});
