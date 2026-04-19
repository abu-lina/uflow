import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllValidCities } from '@/services/providers';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('fetchAllValidCities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and return sorted list of valid cities from cities table', async () => {
    const mockCities = [
      { city_name: 'München' },
      { city_name: 'Berlin' },
      { city_name: 'Hamburg' },
    ];

    const { supabase } = await import('@/lib/supabase/client');
    const mockSelect = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: mockCities, error: null }),
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const result = await fetchAllValidCities();

    expect(supabase.from).toHaveBeenCalledWith('cities');
    expect(mockSelect).toHaveBeenCalledWith('city_name');
    expect(result).toEqual(['Berlin', 'Hamburg', 'München']); // Sorted alphabetically
  });

  it('should return empty array on error', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    const mockSelect = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const result = await fetchAllValidCities();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should handle empty data gracefully', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    const mockSelect = vi.fn().mockReturnValue({
      returns: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const result = await fetchAllValidCities();

    expect(result).toEqual([]);
  });
});

describe('checkCityExists', () => {
  it('should return true when city exists (case-insensitive exact match)', async () => {
    const { checkCityExists } = await import('@/services/providers');
    const { supabase } = await import('@/lib/supabase/client');

    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ city_name: 'Berlin' }],
      error: null,
    });
    const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const result = await checkCityExists('berlin');

    expect(result).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('cities');
    expect(mockSelect).toHaveBeenCalledWith('city_name');
    expect(mockIlike).toHaveBeenCalledWith('city_name', 'berlin');
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it('should return false when city does not exist', async () => {
    const { checkCityExists } = await import('@/services/providers');
    const { supabase } = await import('@/lib/supabase/client');

    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const result = await checkCityExists('nonexistentcity');
    expect(result).toBe(false);
  });
});
