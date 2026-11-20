/**
 * Tests for getMapLocations — Plan 261 map pin fetch cap.
 * Verifies the deterministic order + MAP_LOCATIONS_LIMIT cap and that
 * the existing filters/error handling are preserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMapLocations, MAP_LOCATIONS_LIMIT } from '@/services/providers/map-pins';
import { TIER_EMBED, TIER_OR_RULES } from '@/services/providers/tierFilter';

const mockSelect = vi.fn();
const mockNot = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockOr = vi.fn();
const mockFilter = vi.fn();
const mockReturns = vi.fn();

// The query builder is awaited directly, so the chain must be thenable.
type QueryResult = { data: unknown[] | null; error: { message: string } | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chain: Record<string, any> = {
  select: mockSelect,
  not: mockNot,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  or: mockOr,
  filter: mockFilter,
  returns: mockReturns,
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
    for (const m of [
      mockSelect,
      mockNot,
      mockEq,
      mockOrder,
      mockLimit,
      mockOr,
      mockFilter,
      mockReturns,
    ]) {
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

  it.each(['food', 'store', 'ummah'] as const)(
    'filters to the requested %s section',
    async (section) => {
      await getMapLocations({ section });

      expect(mockEq).toHaveBeenCalledWith('providers.listing_type', section);
    },
  );

  it('filters by city only when one is provided', async () => {
    await getMapLocations({ section: 'food', city: 'Berlin' });

    // #674: on the provider row, like the list search
    expect(mockEq).toHaveBeenCalledWith('providers.address_city', 'Berlin');
  });

  it('does not filter by city when none is provided', async () => {
    await getMapLocations({ section: 'food' });

    expect(mockEq).not.toHaveBeenCalledWith('providers.address_city', expect.anything());
  });

  it('uses the passed review status when one is given', async () => {
    await getMapLocations({ reviewStatus: 'pending' });

    expect(mockEq).toHaveBeenCalledWith('providers.review_status', 'pending');
    expect(mockEq).not.toHaveBeenCalledWith('providers.review_status', 'approved');
  });

  it('still excludes locations without coordinates', async () => {
    await getMapLocations();

    expect(mockNot).toHaveBeenCalledWith('location_latitude', 'is', null);
    expect(mockNot).toHaveBeenCalledWith('location_longitude', 'is', null);
  });

  it('filters gold tier on the nested food_providers embed (#982)', async () => {
    await getMapLocations({ section: 'food', tier: 'gold' });

    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining(TIER_EMBED));
    expect(mockEq).toHaveBeenCalledWith('providers.food_providers.has_certificate', true);
    expect(mockFilter).toHaveBeenCalledWith(
      'providers.food_providers.certificate_url',
      'not.is',
      null,
    );
    expect(mockOr).not.toHaveBeenCalled();
  });

  it.each(['silver', 'bronze'] as const)(
    'filters %s tier on the nested food_providers embed (#982)',
    async (tier) => {
      await getMapLocations({ section: 'food', tier });

      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining(TIER_EMBED));
      expect(mockOr).toHaveBeenCalledWith(TIER_OR_RULES[tier], {
        referencedTable: 'providers.food_providers',
      });
    },
  );

  it('adds no tier join for a value outside the allowlist (#982)', async () => {
    await getMapLocations({ section: 'food', tier: 'platinum' as never });

    expect(mockSelect).toHaveBeenCalledWith(expect.not.stringContaining('food_providers'));
    expect(mockOr).not.toHaveBeenCalled();
    expect(mockFilter).not.toHaveBeenCalled();
  });

  it('ignores tier outside the food section, like the list (#982)', async () => {
    await getMapLocations({ section: 'store', tier: 'gold' });

    expect(mockSelect).toHaveBeenCalledWith(expect.not.stringContaining('food_providers'));
    expect(mockEq).not.toHaveBeenCalledWith('providers.food_providers.has_certificate', true);
    expect(mockOr).not.toHaveBeenCalled();
    expect(mockFilter).not.toHaveBeenCalled();
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
