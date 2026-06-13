import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, returns: vi.fn() });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockEq, mockSelect, mockFrom };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Import after mock
import { fetchPopularCities } from '@/services/providers';

describe('Plan 170: Provider count regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq, returns: vi.fn().mockResolvedValue({ data: [], error: null }) });
    mockEq.mockReturnValue({ returns: vi.fn().mockResolvedValue({ data: [], error: null }) });
  });

  it('fetchPopularCities with section filter calls eq on listing_type', async () => {
    await fetchPopularCities(5, 'food');
    expect(mockSelect).toHaveBeenCalledWith('address_city');
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'food');
  });

  it('fetchPopularCities without section does not call eq', async () => {
    await fetchPopularCities(5);
    expect(mockSelect).toHaveBeenCalledWith('address_city');
    expect(mockEq).not.toHaveBeenCalled();
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
