import { describe, it, expect } from 'vitest';
import { computeSealTier } from '@/features/providers/computeSealTier';

// #987: a backfilled row has only the three answers true (verification_method defaults to
// 'online', no certificate, no last_verified_at / next_audit_due). The dates are not inputs.
describe('computeSealTier for a backfilled food provider', () => {
  it('shows bronze with the three answers true and nothing else', () => {
    expect(
      computeSealTier('online', false, { noAlcohol: true, noPork: true, noGambling: true }, null),
    ).toBe('bronze');
  });
});
