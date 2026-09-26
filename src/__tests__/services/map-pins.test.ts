/**
 * Tests for getMapLocations — Plan 261 map pin fetch cap.
 * Verifies the deterministic order + MAP_LOCATIONS_LIMIT cap and that
 * the existing filters/error handling are preserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMapLocations, MAP_LOCATIONS_LIMIT } from '@/services/providers/map-pins';

const mockSelect = vi.fn();
const mockNot = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

// The query builder is awaited directly, so the chain must be thenable.
type QueryResult = { data: unknown[] | null; error: { message: string } | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {
  select: mockSelect,
  not: mockNot,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
};

function setResult(result: QueryResult) {
  chain.then = (onFulfilled: (r: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((..._args: any[]) => chain);

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

describe('getMapLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of [mockSelect, mockNot, mockEq, mockOrder, mockLimit]) {
      m.mockReturnValue(chain);
    }
    setResult({ data: [], error: null });
  });

  it('queries the locations table and applies the 1000-row cap with deterministic ordering', async () => {
    await getMapLocations();

    expect(mockFrom).toHaveBeenCalledWith('locations');
    expect(mockOrder).toHaveBeenCalledWith('provider_id', { ascending: true });
    expect(mockLimit).toHaveBeenCalledWith(MAP_LOCATIONS_LIMIT);
    expect(MAP_LOCATIONS_LIMIT).toBe(1000);
  });

  it('filters to approved food providers by default', async () => {
    await getMapLocations();

    expect(mockEq).toHaveBeenCalledWith('providers.listing_type', 'food');
    expect(mockEq).toHaveBeenCalledWith('providers.review_status', 'approved');
  });

  it('uses the passed review status when one is given', async () => {
    await getMapLocations('pending');

    expect(mockEq).toHaveBeenCalledWith('providers.review_status', 'pending');
    expect(mockEq).not.toHaveBeenCalledWith('providers.review_status', 'approved');
  });

  it('still excludes locations without coordinates', async () => {
    await getMapLocations();

    expect(mockNot).toHaveBeenCalledWith('location_latitude', 'is', null);
    expect(mockNot).toHaveBeenCalledWith('location_longitude', 'is', null);
  });

  it('returns an empty array when data is null', async () => {
    setResult({ data: null, error: null });

    await expect(getMapLocations()).resolves.toEqual([]);
  });

  it('throws the error message when the query errors', async () => {
    setResult({ data: null, error: { message: 'postgrest exploded' } });

    await expect(getMapLocations()).rejects.toThrow('postgrest exploded');
  });
});
