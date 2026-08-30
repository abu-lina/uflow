import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGetBadgesForEntity = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock('@/services/badges', () => ({
  getBadgesForEntity: (...args: unknown[]) => mockGetBadgesForEntity(...args),
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

// Mock the default client import so it doesn't fail in test env
vi.mock('@/lib/supabase/client', () => ({
  supabase: {},
}));

/** Build a fake SupabaseClient whose `.from()` delegates to mockFrom */
function makeMockClient() {
  return { from: (...args: unknown[]) => mockFrom(...args) } as never;
}

describe('providers.getProviderById (unified, formerly providers.server)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Admin fallback checks env vars before constructing admin client
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    mockGetBadgesForEntity.mockResolvedValue([]);
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'provider_offers') {
        return {
          select: () => ({
            eq: async () => ({ data: [{ offer_id: 'offer-1' }], error: null }),
          }),
        };
      }

      if (table === 'provider_needs') {
        return {
          select: () => ({
            eq: async () => ({ data: [{ need_id: 'need-1' }], error: null }),
          }),
        };
      }

      throw new Error(`Unexpected admin table: ${table}`);
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  provider_id: 'p-1',
                  provider_name: 'Provider One',
                  category: { name_de: 'Kategorie', name_en: 'Category' },
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'provider_offers') {
        return {
          select: () => ({
            eq: async () => ({ data: [{ offer_id: 'offer-1' }], error: null }),
          }),
        };
      }

      if (table === 'provider_needs') {
        return {
          select: () => ({
            eq: async () => ({ data: [{ need_id: 'need-1' }], error: null }),
          }),
        };
      }

      if (table === 'offers') {
        return {
          select: () => ({
            in: async () => ({ data: [{ name_de: 'Angebot A' }], error: null }),
          }),
        };
      }

      if (table === 'needs') {
        return {
          select: () => ({
            in: async () => ({ data: [{ name_de: 'Bedarf B' }], error: null }),
          }),
        };
      }

      if (table === 'food_providers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  verification_method: 'onsite',
                  has_certificate: false,
                  no_alcohol: true,
                  no_pork: true,
                  no_gambling: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'store_providers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { no_gambling: false }, error: null }),
            }),
          }),
        };
      }

      if (table === 'food_menu') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('returns provider with resolved offers and needs via injected client', async () => {
    const { getProviderById } = await import('@/services/providers');

    const result = await getProviderById('p-1', makeMockClient());

    expect(result?.offers).toEqual([{ name_de: 'Angebot A' }]);
    expect(result?.needs).toEqual([{ name_de: 'Bedarf B' }]);
  });

  it('falls back to admin relation reads when injected client relation queries return no rows', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  provider_id: 'p-1',
                  provider_name: 'Provider One',
                  category: { name_de: 'Kategorie', name_en: 'Category' },
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'provider_offers') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }

      if (table === 'provider_needs') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }

      if (table === 'offers') {
        return {
          select: () => ({
            in: async () => ({ data: [{ name_de: 'Angebot A' }], error: null }),
          }),
        };
      }

      if (table === 'needs') {
        return {
          select: () => ({
            in: async () => ({ data: [{ name_de: 'Bedarf B' }], error: null }),
          }),
        };
      }

      if (table === 'food_providers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === 'store_providers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === 'food_menu') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { getProviderById } = await import('@/services/providers');
    const result = await getProviderById('p-1', makeMockClient());

    expect(result?.offers).toEqual([{ name_de: 'Angebot A' }]);
    expect(result?.needs).toEqual([{ name_de: 'Bedarf B' }]);
  });
});
