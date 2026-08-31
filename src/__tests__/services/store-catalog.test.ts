import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as [string, Record<string, unknown>])),
  },
}));

import { searchProviderItems } from '@/services/store-catalog';

describe('searchProviderItems (Plan 096)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls search_provider_items with defaults and returns rows', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          item_id: 'item-1',
          provider_id: 'provider-1',
          item_type: 'menu_item',
          name_de: 'Doener',
          name_en: 'Doner',
          price_cents: 1200,
          is_available: true,
          rank: 0.9,
        },
      ],
      error: null,
    });

    const rows = await searchProviderItems({
      search_query: 'doener',
      listing_type_filter: 'food',
    });

    expect(mockRpc).toHaveBeenCalledWith('search_provider_items', {
      search_query: 'doener',
      listing_type_filter: 'food',
      provider_id_filter: null,
      limit_count: 20,
      offset_count: 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      item_id: 'item-1',
      provider_id: 'provider-1',
      name_de: 'Doener',
    });
  });

  it('throws when Supabase RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error('rpc failed'),
    });

    await expect(
      searchProviderItems({ search_query: 'x', listing_type_filter: null }),
    ).rejects.toThrow('rpc failed');
  });
});
