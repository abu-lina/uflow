import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useNearMeToggle } from '@/features/search/hooks/useNearMeToggle';

describe('useNearMeToggle', () => {
  const originalGeolocation = navigator.geolocation;
  const mockReplace = vi.fn();
  const router = { replace: mockReplace };

  beforeEach(() => {
    mockReplace.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('starts inactive with default radius 5km', () => {
    const { result } = renderHook(() =>
      useNearMeToggle(router, new URLSearchParams('section=food'), '/providers'),
    );

    expect(result.current.nearMeActive).toBe(false);
    expect(result.current.openNowActive).toBe(false);
    expect(result.current.radiusKm).toBe(5);
  });

  it('requests location on first near-me toggle and syncs near_lat/near_lon/near_radius once granted', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 52.52, longitude: 13.405 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() =>
      useNearMeToggle(router, new URLSearchParams('section=food'), '/providers'),
    );

    act(() => {
      result.current.onToggleNearMe();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    const [pushedUrl] = mockReplace.mock.calls.at(-1) as [string];
    expect(pushedUrl).toContain('near_lat=52.52');
    expect(pushedUrl).toContain('near_lon=13.405');
    expect(pushedUrl).toContain('near_radius=5');
  });

  it('preserves existing query params (e.g. section, q) when syncing near-me params', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 52.52, longitude: 13.405 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() =>
      useNearMeToggle(
        router,
        new URLSearchParams('section=food&q=falafel'),
        '/providers',
      ),
    );

    act(() => {
      result.current.onToggleNearMe();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    const [pushedUrl] = mockReplace.mock.calls.at(-1) as [string];
    expect(pushedUrl).toContain('section=food');
    expect(pushedUrl).toContain('q=falafel');
  });

  it('removes near_lat/near_lon/near_radius from the URL when toggled off', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 52.52, longitude: 13.405 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() =>
      useNearMeToggle(
        router,
        new URLSearchParams('section=food&near_lat=52.52&near_lon=13.405&near_radius=5'),
        '/providers',
      ),
    );

    act(() => {
      result.current.onToggleNearMe();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    const [pushedUrl] = mockReplace.mock.calls.at(-1) as [string];
    expect(pushedUrl).not.toContain('near_lat=');
    expect(pushedUrl).not.toContain('near_lon=');
    expect(pushedUrl).not.toContain('near_radius=');
  });

  it('syncs open_now=1 when the open-now toggle is switched on', () => {
    const { result } = renderHook(() =>
      useNearMeToggle(router, new URLSearchParams('section=food'), '/providers'),
    );

    act(() => {
      result.current.onToggleOpenNow();
    });

    expect(mockReplace).toHaveBeenCalled();
    const [pushedUrl] = mockReplace.mock.calls.at(-1) as [string];
    expect(pushedUrl).toContain('open_now=1');
  });

  it('updates near_radius in the URL when the radius changes while active', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 52.52, longitude: 13.405 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() =>
      useNearMeToggle(router, new URLSearchParams('section=food'), '/providers'),
    );

    act(() => {
      result.current.onToggleNearMe();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    mockReplace.mockClear();

    act(() => {
      result.current.onRadiusChange(10);
    });

    expect(mockReplace).toHaveBeenCalled();
    const [pushedUrl] = mockReplace.mock.calls.at(-1) as [string];
    expect(pushedUrl).toContain('near_radius=10');
  });
});
