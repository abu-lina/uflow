import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getHalalAttestationValues, checkHalalAttestation } from '../halal-gate';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => mockFrom(table) }),
}));

/**
 * #548 rework: the review endpoint's pre-flight must surface a missing
 * provider as NOT_FOUND: so the route answers 404 — previously a nonexistent
 * id threw "Failed to fetch provider" and 500'd before the RPC's own
 * NOT_FOUND signal was ever reached.
 */
function mockProvidersLookup(result: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'providers') throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => result }),
      }),
    };
  });
}

describe('getHalalAttestationValues — missing provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND: when the provider row does not exist', async () => {
    mockProvidersLookup({ data: null, error: null });

    await expect(getHalalAttestationValues('missing-id')).rejects.toThrow(/^NOT_FOUND:/);
  });

  it('checkHalalAttestation propagates the NOT_FOUND signal', async () => {
    mockProvidersLookup({ data: null, error: null });

    await expect(checkHalalAttestation('missing-id')).rejects.toThrow(/^NOT_FOUND:/);
  });

  it('still throws "Failed to fetch provider" on a real query error', async () => {
    mockProvidersLookup({ data: null, error: { message: 'connection reset' } });

    await expect(getHalalAttestationValues('p1')).rejects.toThrow(
      'Failed to fetch provider: connection reset',
    );
  });
});
