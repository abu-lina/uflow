import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGetBadgesForEntityServer = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/services/badges.server', () => ({
  getBadgesForEntityServer: (...args: unknown[]) => mockGetBadgesForEntityServer(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

describe('providers.server.getProviderById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBadgesForEntityServer.mockResolvedValue([]);
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

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('[pre-fix FAILS] returns provider with resolved offers and needs for SSR initialData parity', async () => {
    const { getProviderById } = await import('@/services/providers.server');

    const result = await getProviderById('p-1');

    expect(result?.offers).toEqual([{ name_de: 'Angebot A' }]);
    expect(result?.needs).toEqual([{ name_de: 'Bedarf B' }]);
  });

  it('[pre-fix FAILS] falls back to admin relation reads when anon relation queries return no rows', async () => {
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

      throw new Error(`Unexpected table: ${table}`);
    });

    const { getProviderById } = await import('@/services/providers.server');
    const result = await getProviderById('p-1');

    expect(result?.offers).toEqual([{ name_de: 'Angebot A' }]);
    expect(result?.needs).toEqual([{ name_de: 'Bedarf B' }]);
  });
});
