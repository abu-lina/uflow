import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  admin: true,
  rows: [] as Record<string, unknown>[],
  error: null as { message: string } | null,
  queries: 0,
}));

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: () => Promise.resolve(state.user),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: () => Promise.resolve(state.admin),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseCallerClient: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => {
              state.queries += 1;
              return Promise.resolve({ data: state.rows, error: state.error });
            },
          }),
        }),
      }),
    }),
}));

import { getProviderScreenings } from './provider-screenings.server';

const flag = (code: string, term = 'x') => ({
  code,
  term,
  snippet: `…${term}…`,
  url: 'https://example.com/e',
  source: 'website',
});

const row = (
  source: string,
  status: string,
  created_at: string,
  flags: Record<string, unknown>[] = [],
) => ({ screening_id: `${source}-${created_at}`, source, status, flags, created_at });

describe('getProviderScreenings (#766)', () => {
  beforeEach(() => {
    state.user = { id: 'u1' };
    state.admin = true;
    state.rows = [];
    state.error = null;
    state.queries = 0;
  });

  it('AC1: status is the worst of the latest screening per source', async () => {
    state.rows = [
      row('website', 'clear', '2026-10-03T00:00:00Z'),
      row('website', 'flagged', '2026-10-01T00:00:00Z', [flag('alcohol')]),
      row('delivery_menu', 'review', '2026-10-02T00:00:00Z', [flag('not_halal')]),
    ];
    const result = await getProviderScreenings('p1');
    expect(result).toMatchObject({ state: 'ready', status: 'review' });
  });

  it('AC1: flagged beats review and clear', async () => {
    state.rows = [
      row('website', 'clear', '2026-10-03T00:00:00Z'),
      row('delivery_menu', 'flagged', '2026-10-02T00:00:00Z', [flag('pork')]),
      row('google_maps_apify', 'review', '2026-10-02T00:00:00Z', [flag('not_halal')]),
    ];
    const result = await getProviderScreenings('p1');
    expect(result).toMatchObject({ state: 'ready', status: 'flagged' });
  });

  it('AC1: only flags from the latest screening per source are returned', async () => {
    state.rows = [
      row('website', 'clear', '2026-10-03T00:00:00Z'),
      row('website', 'flagged', '2026-10-01T00:00:00Z', [flag('alcohol', 'bier')]),
    ];
    const result = await getProviderScreenings('p1');
    expect(result).toMatchObject({ state: 'ready', status: 'clear', risks: [] });
  });

  it('AC3: halal_positive flags are separate and never lower the status', async () => {
    state.rows = [
      row('website', 'review', '2026-10-03T00:00:00Z', [
        flag('not_halal', 'nicht halal'),
        flag('halal_positive', 'halal'),
      ]),
    ];
    const result = await getProviderScreenings('p1');
    if (result.state !== 'ready') throw new Error('expected ready');
    expect(result.status).toBe('review');
    expect(result.risks.map((f) => f.code)).toEqual(['not_halal']);
    expect(result.positives.map((f) => f.code)).toEqual(['halal_positive']);
  });

  it('AC3: a status that is not clear/review/flagged is treated as review, not green', async () => {
    state.rows = [row('website', 'bogus', '2026-10-03T00:00:00Z')];
    const result = await getProviderScreenings('p1');
    expect(result).toMatchObject({ state: 'ready', status: 'review' });
  });

  it('AC4: no screening rows gives the empty state', async () => {
    state.rows = [];
    expect(await getProviderScreenings('p1')).toEqual({ state: 'empty' });
  });

  it('AC4: a failed query gives the error state', async () => {
    state.error = { message: 'boom' };
    expect(await getProviderScreenings('p1')).toEqual({ state: 'error' });
  });

  it('AC5: non-admins get no screening data and no query is made', async () => {
    state.admin = false;
    state.rows = [row('website', 'flagged', '2026-10-03T00:00:00Z', [flag('alcohol')])];
    expect(await getProviderScreenings('p1')).toEqual({ state: 'forbidden' });
    expect(state.queries).toBe(0);
  });

  it('AC5: anonymous callers get no screening data and no query is made', async () => {
    state.user = null;
    expect(await getProviderScreenings('p1')).toEqual({ state: 'forbidden' });
    expect(state.queries).toBe(0);
  });
});
