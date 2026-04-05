import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockGetBadgesForEntityServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/services/badges.server', () => ({
  getBadgesForEntityServer: (...args: unknown[]) => mockGetBadgesForEntityServer(...args),
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

describe('providers.server.getProviderById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBadgesForEntityServer.mockResolvedValue([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  provider_id: 'p-1',
                  provider_name: 'Provider One',
                  offers_ids: ['offer-1'],
                  needs_ids: ['need-1'],
                  category: { name_de: 'Kategorie', name_en: 'Category' },
                },
                error: null,
              }),
            }),
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

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('[pre-fix FAILS] returns provider with resolved offers and needs for SSR initialData parity', async () => {
    const { getProviderById } = await import('@/services/providers.server');

    const result = await getProviderById('p-1');

    expect(result?.offers).toEqual([{ name_de: 'Angebot A' }]);
    expect(result?.needs).toEqual([{ name_de: 'Bedarf B' }]);
  });
});
