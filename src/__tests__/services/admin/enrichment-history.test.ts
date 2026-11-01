import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHistoryCandidates, getPendingCandidates } from '@/services/admin/enrichment';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

/** Chainable, awaitable query builder that records every call. */
function builder(result: { data: unknown; error: unknown; count?: number }) {
  const calls: Record<string, unknown[][]> = {};
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) => resolve(result);
        }
        return (...args: unknown[]) => {
          (calls[prop] ??= []).push(args);
          return proxy;
        };
      },
    },
  );
  return { proxy, calls };
}

describe('#839 enrichment candidate queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pending candidates include the evidence column', async () => {
    const q = builder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(q.proxy);

    await getPendingCandidates();

    expect(String(q.calls.select[0][0])).toMatch(/\bevidence\b/);
    expect(q.calls.eq[0]).toEqual(['status', 'pending']);
  });

  it('history returns every non-pending status with provider name and reviewer email', async () => {
    const candidates = builder({
      data: [
        {
          id: 'a',
          status: 'applied',
          reviewer_id: 'u1',
          providers: { provider_name: 'Tevhid' },
        },
        { id: 'b', status: 'auto-applied', reviewer_id: null, providers: null },
      ],
      error: null,
      count: 2,
    });
    const users = builder({ data: [{ user_id: 'u1', email: 'admin@example.com' }], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'enrichment_candidates') return candidates.proxy;
      if (table === 'users') return users.proxy;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await getHistoryCandidates({ providerId: 'p1', limit: 10, offset: 5 });

    expect(candidates.calls.neq[0]).toEqual(['status', 'pending']);
    expect(candidates.calls.eq[0]).toEqual(['provider_id', 'p1']);
    expect(candidates.calls.range[0]).toEqual([5, 14]);
    expect(users.calls.in[0]).toEqual(['user_id', ['u1']]);
    expect(result.total).toBe(2);
    expect(result.data[0]).toMatchObject({
      id: 'a',
      provider_name: 'Tevhid',
      reviewer_email: 'admin@example.com',
    });
    expect(result.data[1]).toMatchObject({ provider_name: 'Unknown', reviewer_email: null });
  });

  it('history skips the reviewer lookup when no row has a reviewer', async () => {
    const candidates = builder({
      data: [{ id: 'b', status: 'auto-applied', reviewer_id: null, providers: null }],
      error: null,
      count: 1,
    });
    mockFrom.mockReturnValue(candidates.proxy);

    await getHistoryCandidates();

    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('history throws when the query fails', async () => {
    mockFrom.mockReturnValue(builder({ data: null, error: { message: 'nope' } }).proxy);

    await expect(getHistoryCandidates()).rejects.toThrow('nope');
  });
});
