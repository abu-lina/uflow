import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/services/providers/client', () => ({
  getSupabaseClient: () => ({ rpc: mockRpc }),
}));

describe('Plan 266 search suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[pre-fix FAILS] uses the scoped tsvector suggestions RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { label: 'Lahmacun', type: 'menuItem' },
        { label: 'Istanbul Grill', type: 'provider' },
      ],
      error: null,
    });

    const { fetchSearchSuggestions } = await import('@/services/providers/suggestions');
    const result = await fetchSearchSuggestions('lahm', 10, { section: 'food', city: 'Berlin' });

    expect(mockRpc).toHaveBeenCalledWith('search_scoped_suggestions', {
      search_query: 'lahm',
      section_filter: 'food',
      city_filter: 'Berlin',
      result_limit: 10,
    });
    expect(result).toEqual([
      { label: 'Lahmacun', type: 'menuItem' },
      { label: 'Istanbul Grill', type: 'provider' },
    ]);
  });
});
