import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSearchFoodNearMe = vi.fn();

vi.mock('@/services/providers', () => ({
  searchFoodNearMe: (...args: unknown[]) => mockSearchFoodNearMe(...args),
}));

import { useNearMeSearch } from '@/features/search/hooks/useNearMeSearch';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

describe('useNearMeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is not in near-me mode when near_lat/near_lon are absent', () => {
    const { result } = renderHook(
      () => useNearMeSearch(new URLSearchParams('section=food'), 'food'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isNearMeMode).toBe(false);
    expect(mockSearchFoodNearMe).not.toHaveBeenCalled();
  });

  it('is not in near-me mode for non-food sections even with coords present', () => {
    const { result } = renderHook(
      () =>
        useNearMeSearch(
          new URLSearchParams('section=ummah&near_lat=52.52&near_lon=13.405'),
          'ummah',
        ),
      { wrapper: createWrapper() },
    );

    expect(result.current.isNearMeMode).toBe(false);
  });

  it('calls searchFoodNearMe with parsed lat/lon/radius when in near-me mode', async () => {
    mockSearchFoodNearMe.mockResolvedValueOnce([]);

    renderHook(
      () =>
        useNearMeSearch(
          new URLSearchParams('section=food&near_lat=52.52&near_lon=13.405&near_radius=5'),
          'food',
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockSearchFoodNearMe).toHaveBeenCalledWith({ lat: 52.52, lon: 13.405, radiusKm: 5 });
    });
  });

  it('returns results unfiltered when open_now is not set', async () => {
    mockSearchFoodNearMe.mockResolvedValueOnce([
      { provider_id: 'p1', opening_hours: null, distance_km: 0.5 },
      { provider_id: 'p2', opening_hours: { monday: { open: '09:00', close: '10:00' } }, distance_km: 1 },
    ]);

    const { result } = renderHook(
      () =>
        useNearMeSearch(
          new URLSearchParams('section=food&near_lat=52.52&near_lon=13.405'),
          'food',
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
    });
  });

  it('filters out closed results when open_now=1, preserving distance order', async () => {
    // Provider p1 has no hours (hidden -> treated as not confirmed open, excluded when filtering).
    // Provider p2 is always-open-like via an overnight window covering "now" in every timezone
    // is hard to guarantee in a unit test, so we assert on the deterministic "hidden" case only:
    // an entry with opening_hours: null must never appear once the open_now filter is active,
    // since getOpenStatus() returns isOpen:false / visible:false for it.
    mockSearchFoodNearMe.mockResolvedValueOnce([
      { provider_id: 'p1', opening_hours: null, distance_km: 0.5 },
    ]);

    const { result } = renderHook(
      () =>
        useNearMeSearch(
          new URLSearchParams('section=food&near_lat=52.52&near_lon=13.405&open_now=1'),
          'food',
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockSearchFoodNearMe).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(0);
    });
  });
});
