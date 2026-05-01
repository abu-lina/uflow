/**
 * Tests for providers service — ILIKE removal regression tests
 * Plan 007: Verify fetchFilteredCities and searchProviders behavior
 * is preserved after replacing ILIKE with tsvector RPC search.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependent services
vi.mock('@/services/communityServices', () => ({
  searchCommunityServices: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/offers', () => ({
  searchOffers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/needs', () => ({
  searchNeeds: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
  getBadgesForEntity: vi.fn().mockResolvedValue([]),
  EntityType: { PROVIDER: 'provider' },
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

// Mock the Supabase client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockReturns = vi.fn();
const mockIlike = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((..._args: any[]) => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    rpc: (...args: unknown[]) => mockRpc(...(args as [string])),
  },
}));

// Chain setup
function setupChain() {
  const chain = {
    select: mockSelect,
    eq: mockEq,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
    returns: mockReturns,
    ilike: mockIlike,
  };

  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOr.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockRange.mockReturnValue(chain);
  mockIlike.mockReturnValue(chain);
  mockReturns.mockResolvedValue({ data: [], error: null });
}

import { fetchFilteredCities, fetchPopularCities, fetchProviderCities } from '@/services/providers';

describe('providers service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupChain();
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('fetchFilteredCities', () => {
    it('returns empty array when no cities match', async () => {
      // Only one providers query now (M-5: CS table dropped)
      mockReturns.mockResolvedValueOnce({ data: [], error: null });

      const result = await fetchFilteredCities(null, null);
      expect(result).toEqual([]);
    });

    it('returns deduplicated sorted cities from providers only (M-5: CS dropped)', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'Berlin' },
          { address_city: 'München' },
          { address_city: 'Berlin' },  // Duplicate
          { address_city: 'Hamburg' },
        ],
        error: null,
      });

      const result = await fetchFilteredCities(null, null);
      expect(result).toContain('Berlin');
      expect(result).toContain('München');
      expect(result).toContain('Hamburg');
      // Duplicates removed
      expect(result.filter(c => c === 'Berlin')).toHaveLength(1);
    });

    it('applies category filter when specified', async () => {
      // Only one providers query now (M-5: CS table dropped)
      mockReturns.mockResolvedValueOnce({ data: [{ address_city: 'Berlin' }], error: null });

      const result = await fetchFilteredCities('some-category-id', null);
      expect(result).toContain('Berlin');
    });

    it('uses RPC search when search query is provided', async () => {
      // After refactor, should use RPC instead of ILIKE
      mockRpc.mockResolvedValueOnce({
        data: [{ city: 'Berlin' }, { city: 'Hamburg' }],
        error: null,
      });

      const result = await fetchFilteredCities(null, 'test query');
      expect(Array.isArray(result)).toBe(true);
      // Must call the RPC, NOT use ILIKE
      expect(mockRpc).toHaveBeenCalledWith('get_filtered_cities_by_search', expect.objectContaining({
        search_query: 'test query',
      }));
    });

    it('filters out null and empty cities', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'Berlin' },
          { address_city: null },
          { address_city: '' },
          { address_city: 'null' },
        ],
        error: null,
      });

      const result = await fetchFilteredCities(null, null);
      expect(result).toEqual(['Berlin']);
    });
  });

  describe('fetchProviderCities', () => {
    it('returns sorted unique cities from providers only', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'München' },
          { address_city: 'Berlin' },
          { address_city: 'Hamburg' },
        ],
        error: null,
      });

      const result = await fetchProviderCities();
      expect(result).toEqual(['Berlin', 'Hamburg', 'München']);
    });
  });

  describe('fetchPopularCities', () => {
    it('returns cities sorted by provider_count desc with city name tie-break', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'Berlin' },
          { address_city: 'Berlin' },
          { address_city: 'Köln' },
          { address_city: 'Hamburg' },
          { address_city: 'Berlin' },
          { address_city: 'Köln' },
        ],
        error: null,
      });

      const result = await fetchPopularCities();

      expect(result).toEqual([
        { city: 'Berlin', provider_count: 3 },
        { city: 'Köln', provider_count: 2 },
        { city: 'Hamburg', provider_count: 1 },
      ]);
    });

    it('applies limit to the sorted result set', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'Berlin' },
          { address_city: 'Berlin' },
          { address_city: 'Köln' },
          { address_city: 'Hamburg' },
          { address_city: 'Berlin' },
          { address_city: 'Köln' },
        ],
        error: null,
      });

      const result = await fetchPopularCities(2);
      expect(result).toEqual([
        { city: 'Berlin', provider_count: 3 },
        { city: 'Köln', provider_count: 2 },
      ]);
    });

    it('returns empty array when query errors and logs error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      mockReturns.mockResolvedValueOnce({ data: null, error: new Error('providers fail') });

      const result = await fetchPopularCities();

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
