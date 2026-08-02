import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as [string])),
  },
}));

import { searchFoodNearMe } from '@/services/providers';

describe('searchFoodNearMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the search_food_near_me RPC with lat/lon/radius/limit', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await searchFoodNearMe({ lat: 52.52, lon: 13.405, radiusKm: 5 });

    expect(mockRpc).toHaveBeenCalledWith('search_food_near_me', {
      p_lat: 52.52,
      p_lon: 13.405,
      p_radius_km: 5,
      p_limit: 100,
    });
  });

  it('returns the RPC rows when the call succeeds', async () => {
    const rows = [
      { provider_id: 'p1', provider_name: 'Sultan Kitchen', distance_km: 0.4 },
      { provider_id: 'p2', provider_name: 'Habibi Falafel', distance_km: 1.2 },
    ];
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });

    const result = await searchFoodNearMe({ lat: 52.52, lon: 13.405, radiusKm: 5 });

    expect(result).toEqual(rows);
  });

  it('returns an empty array when data is null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await searchFoodNearMe({ lat: 52.52, lon: 13.405, radiusKm: 5 });

    expect(result).toEqual([]);
  });

  it('throws when the RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    await expect(
      searchFoodNearMe({ lat: 52.52, lon: 13.405, radiusKm: 5 }),
    ).rejects.toEqual({ message: 'boom' });
  });
});
