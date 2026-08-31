import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn(() => ({
    eq: mockEq,
    returns: vi.fn().mockResolvedValue({ data: [], error: null }),
  }));
  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    returns: vi.fn().mockResolvedValue({ data: [], error: null }),
  }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockEq, mockSelect, mockFrom };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

import { fetchPopularCities } from '@/services/providers';

describe('Plan 170: Provider count regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchPopularCities with section filter calls eq on listing_type', async () => {
    await fetchPopularCities(5, 'food');
    expect(mockSelect).toHaveBeenCalledWith('address_city');
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'food');
  });

  it('fetchPopularCities without section calls eq only on review_status', async () => {
    await fetchPopularCities(5);
    expect(mockSelect).toHaveBeenCalledWith('address_city');
    expect(mockEq).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith('review_status', 'approved');
  });

  it('fetchPopularCities filters by ummah section', async () => {
    await fetchPopularCities(5, 'ummah');
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'ummah');
  });

  it('fetchPopularCities filters by store section', async () => {
    await fetchPopularCities(5, 'store');
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'store');
  });
});
