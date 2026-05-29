/**
 * Compliance-state derivation — the gate rules, centralized.
 *
 * From a parsed account-token relationship plus the token's pause state, derive
 * whether an account can receive/send the token. This is the native equivalent of
 * Part 1's ComplianceRegistry checks: association + KYC + freeze + pause, enforced
 * by the network, read back from the Mirror Node.
 *
 *   canReceive = associated AND kyc-satisfied AND not frozen AND token not paused
 *   canSend    = same compliance gates (a positive balance is a separate, non-
 *                compliance concern and is intentionally NOT folded in here)
 *
 * `kycGranted` reflects an explicit GRANTED status. A token with no kycKey reports
 * `NOT_APPLICABLE`: there is no KYC gate, so it does not block transfers — but
 * `kycGranted` stays false because nothing was granted.
 */

import type { AccountTokenRelationship } from '../mirror/types.js';

export interface ComplianceState {
  associated: boolean;
  kycGranted: boolean;
  frozen: boolean;
  tokenPaused: boolean;
  canReceive: boolean;
  canSend: boolean;
}

export interface ComplianceInput {
  relationship?: AccountTokenRelationship | null;
  tokenPaused: boolean;
}

export function deriveComplianceState(input: ComplianceInput): ComplianceState {
  const { relationship, tokenPaused } = input;
  const associated = relationship != null;

  const kycGranted = relationship?.kycStatus === 'GRANTED';
  const frozen = relationship?.freezeStatus === 'FROZEN';

  // The KYC gate passes when KYC is GRANTED or when there is no KYC key
  // (NOT_APPLICABLE). It blocks only on an explicit REVOKED.
  const kycSatisfied =
    relationship?.kycStatus === 'GRANTED' || relationship?.kycStatus === 'NOT_APPLICABLE';

  const gatesOpen = associated && kycSatisfied && !frozen && !tokenPaused;

  return {
    associated,
    kycGranted,
    frozen,
    tokenPaused,
    canReceive: gatesOpen,
    canSend: gatesOpen,
  };
}
