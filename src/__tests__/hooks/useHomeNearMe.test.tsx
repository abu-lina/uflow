import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useHomeNearMe } from '@/features/search/hooks/useHomeNearMe';
import { searchFoodNearMe, type NearMeFoodResult } from '@/services/providers';

vi.mock('@/services/providers', () => ({
  searchFoodNearMe: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logApp: vi.fn(),
}));

const searchFoodNearMeMock = vi.mocked(searchFoodNearMe);

const makeResult = (
  id: string,
  distance_km: number,
  openDay: 'monday' | 'tuesday',
): NearMeFoodResult => ({
  provider_id: id,
  provider_name: `Provider ${id}`,
  provider_images: null,
  category_id: null,
  category_name_de: null,
  category_name_en: null,
  category_images: null,
  address_city: 'Berlin',
  opening_hours: {
    [openDay]: { open: '09:00', close: '17:00' },
  } as unknown as NearMeFoodResult['opening_hours'],
  location_latitude: 52.5,
  location_longitude: 13.4,
  distance_km,
});

describe('useHomeNearMe', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Pin to Monday 2024-01-01 12:00 UTC so open-now tests are deterministic.
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    searchFoodNearMeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[post-fix PASSES] inactive when coords === null → isActive: false, results: [], no RPC call', () => {
    searchFoodNearMeMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useHomeNearMe({ coords: null, enabled: true, openNowActive: false }),
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(searchFoodNearMeMock).not.toHaveBeenCalled();
  });

  it('[post-fix PASSES] inactive when enabled === false (map view) even with coords → no RPC call', () => {
    searchFoodNearMeMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useHomeNearMe({
        coords: { lat: 52.52, lon: 13.405 },
        enabled: false,
        openNowActive: false,
      }),
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(searchFoodNearMeMock).not.toHaveBeenCalled();
  });

  it('[post-fix PASSES] active calls searchFoodNearMe with { lat, lon, radiusKm: 25 }', async () => {
    searchFoodNearMeMock.mockResolvedValue([]);

    renderHook(() =>
      useHomeNearMe({
        coords: { lat: 52.52, lon: 13.405 },
        enabled: true,
        openNowActive: false,
      }),
    );

    await waitFor(() => {
      expect(searchFoodNearMeMock).toHaveBeenCalledTimes(1);
    });

    expect(searchFoodNearMeMock).toHaveBeenCalledWith({
      lat: 52.52,
      lon: 13.405,
      radiusKm: 25,
    });
  });

  it('[post-fix PASSES] preserves RPC distance order (returns mocked results in input order, no re-sort)', async () => {
    const rpcResults: NearMeFoodResult[] = [
      makeResult('p-far', 10, 'monday'),
      makeResult('p-near', 2, 'monday'),
      makeResult('p-mid', 5, 'monday'),
    ];
    searchFoodNearMeMock.mockResolvedValue(rpcResults);

    const { result } = renderHook(() =>
      useHomeNearMe({
        coords: { lat: 52.52, lon: 13.405 },
        enabled: true,
        openNowActive: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results.map((r) => r.provider_id)).toEqual([
      'p-far',
      'p-near',
      'p-mid',
    ]);
  });

  it('[post-fix PASSES] open-now interplay: filters to open-only and preserves order; false passes through unchanged', async () => {
    const rpcResults: NearMeFoodResult[] = [
      makeResult('p-closed-today', 1, 'tuesday'),
      makeResult('p-open-today', 2, 'monday'),
      makeResult('p-also-closed', 3, 'tuesday'),
    ];
    searchFoodNearMeMock.mockResolvedValue(rpcResults);

    const { result, rerender } = renderHook(
      ({ openNowActive }: { openNowActive: boolean }) =>
        useHomeNearMe({
          coords: { lat: 52.52, lon: 13.405 },
          enabled: true,
          openNowActive,
        }),
      { initialProps: { openNowActive: false } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.results.map((r) => r.provider_id)).toEqual([
      'p-closed-today',
      'p-open-today',
      'p-also-closed',
    ]);

    rerender({ openNowActive: true });

    await waitFor(() => {
      expect(result.current.results.map((r) => r.provider_id)).toEqual([
        'p-open-today',
      ]);
    });

    // Search should only have been invoked once — open-now toggles client-side filtering.
    expect(searchFoodNearMeMock).toHaveBeenCalledTimes(1);
  });

  it('[post-fix PASSES] error propagation: RPC rejects → error set, results: []', async () => {
    searchFoodNearMeMock.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() =>
      useHomeNearMe({
        coords: { lat: 52.52, lon: 13.405 },
        enabled: true,
        openNowActive: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('network down');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('[post-fix PASSES] refetch() re-invokes the RPC', async () => {
    searchFoodNearMeMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useHomeNearMe({
        coords: { lat: 52.52, lon: 13.405 },
        enabled: true,
        openNowActive: false,
      }),
    );

    await waitFor(() => {
      expect(searchFoodNearMeMock).toHaveBeenCalledTimes(1);
    });

    result.current.refetch();

    await waitFor(() => {
      expect(searchFoodNearMeMock).toHaveBeenCalledTimes(2);
    });
  });
});
