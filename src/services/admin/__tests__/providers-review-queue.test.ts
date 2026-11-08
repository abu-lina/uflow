import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getReadyForReviewProviders } from '../providers';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

// Build a fluent chain that ends with the specified terminal methods resolving a value.
// All intermediate methods (.select, .eq, .not) return the same chain.
function chain(terminalResult: unknown, terminals = ['order', 'in']) {
  const obj: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_, prop: string) {
      if (prop === 'then') return undefined;
      if (terminals.includes(prop)) return vi.fn().mockResolvedValue(terminalResult);
      return vi.fn().mockReturnValue(proxy);
    },
  };
  const proxy = new Proxy(obj, handler);
  return proxy;
}

const providerRow = {
  provider_id: 'p1',
  provider_name: 'Halal Kitchen',
  provider_images: null,
  category_id: null,
  address_city: 'Berlin',
  contact_email: null,
  review_status: 'pending',
  review_feedback: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  user_created_id: null,
  last_enriched_at: '2026-01-02T00:00:00Z',
};

function setup({
  providers = { data: [providerRow], error: null },
  screenings = { data: [{ provider_id: 'p1', status: 'clear', flags: [] }], error: null },
  candidates = { data: [], error: null },
}: {
  providers?: unknown;
  screenings?: unknown;
  candidates?: unknown;
} = {}) {
  vi.clearAllMocks();
  mockFrom.mockImplementation((table: string) => {
    if (table === 'providers')
      return { select: vi.fn().mockReturnValue(chain(providers, ['order'])) };
    if (table === 'provider_screenings')
      return { select: vi.fn().mockReturnValue(chain(screenings, ['in'])) };
    if (table === 'enrichment_candidates')
      return { select: vi.fn().mockReturnValue(chain(candidates, ['in'])) };
    throw new Error(`unexpected table: ${table}`);
  });
}

describe('getReadyForReviewProviders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns providers with correct shape', async () => {
    setup();
    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });
    expect(result.data[0].provider_id).toBe('p1');
    expect(result.data[0].screening_status).toBe('clear');
    expect(result.pagination).toEqual({ total: 1, limit: 10, offset: 0, hasMore: false });
  });

  it('filters out providers with no screening rows', async () => {
    setup({ screenings: { data: [], error: null } });
    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });
    expect(result.data).toEqual([]);
  });

  it('filters out providers with pending enrichment candidates', async () => {
    setup({
      candidates: {
        data: [
          {
            provider_id: 'p1',
            field_name: 'wolt_url',
            proposed_value: 'https://w.com',
            source_url: null,
            status: 'pending',
          },
        ],
        error: null,
      },
    });
    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });
    expect(result.data).toEqual([]);
  });

  it('derives platform label and url from applied candidates', async () => {
    setup({
      candidates: {
        data: [
          {
            provider_id: 'p1',
            field_name: 'wolt_url',
            proposed_value: 'https://wolt.com/x',
            source_url: null,
            status: 'applied',
          },
          {
            provider_id: 'p1',
            field_name: 'ubereats_url',
            proposed_value: 'https://ue.com/y',
            source_url: null,
            status: 'auto-applied',
          },
        ],
        error: null,
      },
    });
    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });
    expect(result.data[0].enrichment_links).toEqual([
      { platform: 'Wolt', url: 'https://wolt.com/x' },
      { platform: 'Uber Eats', url: 'https://ue.com/y' },
    ]);
  });

  it('returns empty list when no providers found', async () => {
    setup({ providers: { data: [], error: null } });
    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('throws on DB error', async () => {
    setup({ providers: { data: null, error: { message: 'connection failed' } } });
    await expect(getReadyForReviewProviders({ limit: 10, offset: 0 })).rejects.toThrow(
      'Failed to fetch review queue',
    );
  });

  it('applies client-side pagination correctly', async () => {
    const rows = ['p1', 'p2', 'p3'].map((id) => ({ ...providerRow, provider_id: id }));
    const screenings = rows.map((r) => ({
      provider_id: r.provider_id,
      status: 'clear',
      flags: [],
    }));
    setup({
      providers: { data: rows, error: null },
      screenings: { data: screenings, error: null },
    });

    const result = await getReadyForReviewProviders({ limit: 1, offset: 2 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].provider_id).toBe('p3');
    expect(result.pagination).toEqual({ total: 3, limit: 1, offset: 2, hasMore: false });
  });

  it('calculates hasMore correctly', async () => {
    const rows = ['p1', 'p2', 'p3'].map((id) => ({ ...providerRow, provider_id: id }));
    const screenings = rows.map((r) => ({
      provider_id: r.provider_id,
      status: 'clear',
      flags: [],
    }));
    setup({
      providers: { data: rows, error: null },
      screenings: { data: screenings, error: null },
    });

    const result = await getReadyForReviewProviders({ limit: 2, offset: 0 });
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.total).toBe(3);
  });
});
