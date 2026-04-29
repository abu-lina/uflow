import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockNeq = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('matching service phase 3 junction tables', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => ({
      select: (...args: unknown[]) => {
        mockSelect(table, ...args);

        if (table === 'provider_offers') {
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return Promise.resolve({
                data: [{ offer_id: 'offer-1' }],
                error: null,
              });
            },
          };
        }

        if (table === 'provider_needs') {
          return {
            in: (...inArgs: unknown[]) => {
              mockIn(...inArgs);
              return {
                neq: (...neqArgs: unknown[]) => {
                  mockNeq(...neqArgs);
                  return Promise.resolve({
                    data: [{ provider_id: 'provider-2', need_id: 'offer-1' }],
                    error: null,
                  });
                },
              };
            },
          };
        }

        if (table === 'providers') {
          return {
            in: () => Promise.resolve({
              data: [{ provider_id: 'provider-2', provider_name: 'P2', category_id: null }],
              error: null,
            }),
          };
        }

        if (table === 'offers') {
          return {
            in: () => Promise.resolve({
              data: [{ offer_id: 'offer-1', name_de: 'Angebot 1' }],
              error: null,
            }),
          };
        }

        return {
          in: () => Promise.resolve({ data: [], error: null }),
        };
      },
    }));
  });

  it('[pre-fix FAILS] findProvidersNeedingMyOffers reads from provider_offers/provider_needs junction tables', async () => {
    const { findProvidersNeedingMyOffers } = await import('@/services/matching');

    const result = await findProvidersNeedingMyOffers('provider-1');

    expect(mockFrom).toHaveBeenCalledWith('provider_offers');
    expect(mockFrom).toHaveBeenCalledWith('provider_needs');
    expect(mockIn).toHaveBeenCalledWith('need_id', ['offer-1']);
    expect(result).toHaveLength(1);
  });
});
