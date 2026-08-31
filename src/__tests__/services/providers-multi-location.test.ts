import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockReturns = vi.fn();
const mockIlike = vi.fn();
const mockIn = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn((..._args: unknown[]) => ({
  select: mockSelect,
  insert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    rpc: (...args: unknown[]) => mockRpc(...(args as [string])),
  },
}));

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
    in: mockIn,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  };

  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockOr.mockReturnValue(chain);
  mockOrder.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockRange.mockReturnValue(chain);
  mockIlike.mockReturnValue(chain);
  mockIn.mockReturnValue(chain);
  mockReturns.mockResolvedValue({ data: [], error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });
}

import { getProviderById, getProviders, transformProviderToSearchResult, fetchProviderCities, fetchPopularCities, fetchFilteredCities } from '@/services/providers';
import type { Provider } from '@/services/providers';
import type { Location } from '@/types/location';

describe('multi-location provider service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupChain();
    mockFrom.mockReturnValue({ select: mockSelect, insert: vi.fn().mockResolvedValue({ error: null }) });
  });

  describe('getProviderById', () => {
    it('[post-fix PASSES] returns locations(*) nested in the same select query (no N+1)', async () => {
      const mockLocations = [
        { location_id: 'loc-1', provider_id: 'p-1', address_city: 'Berlin', is_primary: true },
        { location_id: 'loc-2', provider_id: 'p-1', address_city: 'Hamburg', is_primary: false },
      ];
      mockSingle.mockResolvedValue({
        data: {
          provider_id: 'p-1',
          provider_name: 'Provider One',
          locations: mockLocations,
          category: { name_de: 'Test', name_en: 'Test' },
        },
        error: null,
      });

      const { getBadgesForEntity } = await import('@/services/badges');
      vi.mocked(getBadgesForEntity).mockResolvedValue([]);

      await getProviderById('p-1');

      const selectCall = mockSelect.mock.calls[0][0];
      expect(selectCall).toContain('locations(*)');
    });
  });

  describe('getProviders', () => {
    it('[post-fix PASSES] includes locations(*) when includeLocations is true', async () => {
      mockReturns.mockResolvedValue({ data: [], error: null });

      await getProviders(10, true);

      const lastCall = mockSelect.mock.calls[mockSelect.mock.calls.length - 1][0];
      expect(lastCall).toContain('locations(*)');
    });

    it('[post-fix PASSES] does not include locations when includeLocations is false/undefined', async () => {
      mockReturns.mockResolvedValue({ data: [], error: null });

      await getProviders(10);

      const selectCall = mockSelect.mock.calls[0][0];
      expect(selectCall).not.toContain('locations(*)');
    });
  });

  describe('transformProviderToSearchResult', () => {
    it('[post-fix PASSES] sets images to null when provider_images is null', () => {
      const provider: Provider = {
        provider_id: 'p-1',
        provider_name: 'Test',
        provider_images: null,
        category_id: null,
        address_city: null,
        social_website: null,
        social_instagram: null,
        contact_email: null,
        contact_phone: null,
        address_street: null,
        address_country: null,
        address_zip: null,
        location_latitude: null,
        location_longitude: null,
        created_at: null,
        updated_at: null,
        offers_ids: [],
        needs_ids: [],
      };

      const result = transformProviderToSearchResult(provider);
      expect(result.images).toBeNull();
    });

    it('[post-fix PASSES] passes through locations from provider to SearchResult', () => {
      const mockLocations: Location[] = [
        { location_id: 'loc-1', provider_id: 'p-1', location_name: 'Berlin Mitte', address_street: 'Str 1', address_zip: '10115', address_city: 'Berlin', address_country: 'DE', location_latitude: null, location_longitude: null, opening_hours: null, show_address: true, contact_phone: null, is_primary: true, created_at: null, updated_at: null },
      ];
      const provider: Provider = {
        provider_id: 'p-1',
        provider_name: 'Test',
        provider_images: null,
        category_id: null,
        address_city: 'Berlin',
        social_website: null,
        social_instagram: null,
        contact_email: null,
        contact_phone: null,
        address_street: null,
        address_country: null,
        address_zip: null,
        location_latitude: null,
        location_longitude: null,
        created_at: null,
        updated_at: null,
        offers_ids: [],
        needs_ids: [],
        locations: mockLocations,
      };

      const result = transformProviderToSearchResult(provider);

      expect(result.locations).toBeDefined();
      expect(result.locations).toHaveLength(1);
      expect(result.locations![0].location_id).toBe('loc-1');
    });
  });

  describe('city queries stay on denormalized column', () => {
    it('[post-fix PASSES] fetchProviderCities reads from providers.address_city (not locations)', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [{ address_city: 'Berlin' }, { address_city: 'Hamburg' }],
        error: null,
      });

      await fetchProviderCities();

      expect(mockFrom).toHaveBeenCalledWith('providers');
      const selectCall = mockSelect.mock.calls[0][0];
      expect(selectCall).toBe('address_city');
    });

    it('[post-fix PASSES] fetchPopularCities reads from providers.address_city (not locations)', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [
          { address_city: 'Berlin' },
          { address_city: 'Berlin' },
          { address_city: 'Hamburg' },
        ],
        error: null,
      });

      const result = await fetchPopularCities(2);
      expect(result[0]).toEqual({ city: 'Berlin', provider_count: 2 });
      expect(mockFrom).toHaveBeenCalledWith('providers');
    });

    it('[post-fix PASSES] fetchFilteredCities reads from providers.address_city (not locations)', async () => {
      mockReturns.mockResolvedValueOnce({
        data: [{ address_city: 'Berlin' }, { address_city: 'München' }],
        error: null,
      });

      const result = await fetchFilteredCities(null, null);
      expect(result).toEqual(['Berlin', 'München']);
      expect(mockFrom).toHaveBeenCalledWith('providers');
    });
  });
});
