/**
 * Pure mappings from the core ComplianceState to display badges and a transfer-block
 * reason. All compliance logic lives in core/deriveComplianceState; this only maps the
 * derived booleans to labels/tones for the UI.
 */

import type { ComplianceState } from '@core';

export type BadgeTone = 'ok' | 'warn' | 'bad' | 'neutral';
export interface Badge {
  key: string;
  label: string;
  tone: BadgeTone;
}

export function statusBadges(state: ComplianceState): Badge[] {
  return [
    {
      key: 'associated',
      label: state.associated ? 'Associated' : 'Not associated',
      tone: state.associated ? 'ok' : 'neutral',
    },
    {
      key: 'kyc',
      label: state.kycGranted ? 'KYC granted' : 'KYC not granted',
      tone: state.kycGranted ? 'ok' : 'warn',
    },
    {
      key: 'frozen',
      label: state.frozen ? 'Frozen' : 'Not frozen',
      tone: state.frozen ? 'bad' : 'ok',
    },
    {
      key: 'canReceive',
      label: state.canReceive ? 'Can receive' : 'Cannot receive',
      tone: state.canReceive ? 'ok' : 'warn',
    },
  ];
}

/**
 * Human reason a transfer to `recipient` would be blocked, or null if it should
 * succeed. Names the first failing gate in priority order: paused → not associated →
 * frozen → not KYC-approved. (The authoritative block is still the network's rejection
 * on submit — this is a pre-flight hint.)
 */
export function transferBlockReason(recipient: ComplianceState): string | null {
  if (recipient.canReceive) return null;
  if (recipient.tokenPaused) return 'Token transfers are paused';
  if (!recipient.associated) return 'Recipient has not associated the token';
  if (recipient.frozen) return 'Recipient account is frozen for this token';
  return 'Recipient is not KYC-approved for this token';
}
