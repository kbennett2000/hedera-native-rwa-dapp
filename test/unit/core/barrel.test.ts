import { describe, it, expect } from 'vitest';
import { encodeAuditMessage, deriveComplianceState } from '../../../src/core/index.js';

// Light smoke test: assert the barrel re-exports the key public symbols.
// The real behavior tests live in the individual module test files.

describe('src/core/index barrel', () => {
  it('re-exports encodeAuditMessage', () => {
    expect(typeof encodeAuditMessage).toBe('function');
  });

  it('re-exports deriveComplianceState', () => {
    expect(typeof deriveComplianceState).toBe('function');
  });
});
