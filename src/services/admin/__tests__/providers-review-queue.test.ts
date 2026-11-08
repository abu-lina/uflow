import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getReadyForReviewProviders } from '../providers';

// Mock chained Supabase query builder
const mockRange = vi.fn();
const mockOrder = vi.fn();
const mockNot = vi.fn();
const mockFilter = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockCountSelect = vi.fn();
const mockCountEq = vi.fn();
const mockCountNot = vi.fn();
const mockCountFilter = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
    rpc: vi.fn(),
  }),
}));

describe('getReadyForReviewProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // List query chain: .select().eq().not().filter().order().range()
    mockRange.mockResolvedValue({ data: null, error: null });
    mockOrder.mockReturnValue({ range: mockRange });
    mockFilter.mockReturnValue({ order: mockOrder });
    mockNot.mockReturnValue({ filter: mockFilter });
    mockEq.mockReturnValue({ not: mockNot });
    mockSelect.mockReturnValue({ eq: mockEq });

    // Count query chain: .select().eq().not().filter()
    mockCountFilter.mockResolvedValue({ count: null, error: null });
    mockCountNot.mockReturnValue({ filter: mockCountFilter });
    mockCountEq.mockReturnValue({ not: mockCountNot });
    mockCountSelect.mockReturnValue({ eq: mockCountEq });

    // from() returns different chains depending on call order
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? { select: mockSelect } : { select: mockCountSelect };
    });
  });

  it('returns paginated providers ready for review', async () => {
    const rawRow = {
      provider_id: 'p1',
      provider_name: 'Halal Kitchen',
      address_city: 'Berlin',
      created_at: '2026-01-01T00:00:00Z',
      review_status: 'pending',
      provider_screenings: [{ status: 'clear', flags: [] }],
      enrichment_candidates: [],
    };
    mockRange.mockResolvedValue({ data: [rawRow], error: null });
    mockCountFilter.mockResolvedValue({ count: 1, error: null });

    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });

    expect(result.data[0].provider_id).toBe('p1');
    expect(result.data[0].screening_status).toBe('clear');
    expect(result.data[0].halal_pending).toBe(false);
    expect(result.pagination).toEqual({ total: 1, limit: 10, offset: 0, hasMore: false });
  });

  it('returns empty list when no providers are ready', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });
    mockCountFilter.mockResolvedValue({ count: 0, error: null });

    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('throws on DB error', async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: 'connection failed' } });

    await expect(getReadyForReviewProviders({ limit: 10, offset: 0 })).rejects.toThrow(
      'Failed to fetch review queue',
    );
  });

  it('calculates hasMore correctly', async () => {
    mockRange.mockResolvedValue({ data: Array(10).fill({}), error: null });
    mockCountFilter.mockResolvedValue({ count: 25, error: null });

    const result = await getReadyForReviewProviders({ limit: 10, offset: 0 });

    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.total).toBe(25);
  });
});
