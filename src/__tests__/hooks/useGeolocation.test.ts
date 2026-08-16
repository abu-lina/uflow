import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation, isStandaloneDisplayMode } from '@/hooks/useGeolocation';
import { logApp } from '@/lib/logger';
import { mockMatchMedia } from '../utils/test-utils';

vi.mock('@/lib/logger', () => ({ logApp: vi.fn() }));

describe('useGeolocation', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      configurable: true,
    });
    mockMatchMedia(false);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts in the idle state and does not request location automatically', () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('transitions idle -> prompting -> granted with coords on success', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 52.52, longitude: 13.405 },
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });

    expect(result.current.coords).toEqual({ latitude: 52.52, longitude: 13.405 });
  });

  it('transitions to denied when the browser reports PERMISSION_DENIED', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('denied');
    });
  });

  it('transitions to timeout when the browser reports TIMEOUT', async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 3, message: 'timeout' } as GeolocationPositionError);
      },
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('timeout');
    });
  });

  it('[pre-fix FAILS / post-fix PASSES] transitions to unavailable and logs outcome when the browser lacks geolocation support', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('unavailable');
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'unavailable',
        standalone: false,
        elapsedMs: expect.any(Number),
      }),
    );
  });

  it('reset() returns to idle state', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toBeNull();
  });

  it('[pre-fix FAILS / post-fix PASSES] watchdog forces timeout when getCurrentPosition never calls back (non-standalone)', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      configurable: true,
    });
    mockMatchMedia(false);

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('prompting');

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.status).toBe('timeout');
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'timeout',
        standalone: false,
        forcedByWatchdog: true,
        elapsedMs: expect.any(Number),
      }),
    );
  });

  it('[pre-fix FAILS / post-fix PASSES] watchdog forces denied when standalone and getCurrentPosition never calls back', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      configurable: true,
    });
    mockMatchMedia(false);

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.status).toBe('denied');
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'denied',
        standalone: true,
        forcedByWatchdog: true,
        elapsedMs: expect.any(Number),
      }),
    );
  });

  it('[pre-fix FAILS / post-fix PASSES] watchdog clears when success fires before deadline', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 52.52, longitude: 13.405 },
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.status).toBe('granted');

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.status).toBe('granted');
    expect(logApp).toHaveBeenCalledTimes(1);
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'granted',
        elapsedMs: expect.any(Number),
      }),
    );
    expect(logApp).not.toHaveBeenCalledWith(
      'info',
      expect.objectContaining({ forcedByWatchdog: true }),
    );
  });

  it('[pre-fix FAILS / post-fix PASSES] watchdog clears when error fires before deadline', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 3, message: 'timeout' } as GeolocationPositionError);
      },
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.status).toBe('timeout');

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.status).toBe('timeout');
    expect(logApp).toHaveBeenCalledTimes(1);
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'timeout',
        errorCode: 3,
        elapsedMs: expect.any(Number),
      }),
    );
    expect(logApp).not.toHaveBeenCalledWith(
      'info',
      expect.objectContaining({ forcedByWatchdog: true }),
    );
  });

  it('[pre-fix FAILS / post-fix PASSES] reset clears in-flight watchdog', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    act(() => {
      result.current.reset();
    });

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(result.current.status).toBe('idle');
    expect(logApp).not.toHaveBeenCalled();
  });

  it('[pre-fix FAILS / post-fix PASSES] logs outcome with status, errorCode, standalone and elapsedMs on terminal state', async () => {
    vi.useFakeTimers();

    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
    Object.defineProperty(navigator, 'standalone', {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('denied');
    expect(logApp).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        event: 'geolocation_outcome',
        status: 'denied',
        errorCode: 1,
        standalone: true,
        elapsedMs: expect.any(Number),
      }),
    );
  });

  describe('isStandaloneDisplayMode', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('[pre-fix FAILS / post-fix PASSES] returns false when navigator global is absent', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      Reflect.deleteProperty(globalThis, 'navigator');

      try {
        expect(isStandaloneDisplayMode()).toBe(false);
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(globalThis, 'navigator', originalDescriptor);
        }
      }
    });

    it('returns true when navigator.standalone is true', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: true,
        configurable: true,
      });
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;

      expect(isStandaloneDisplayMode()).toBe(true);
    });

    it('returns true when display-mode standalone matches', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        configurable: true,
      });
      window.matchMedia = vi
        .fn()
        .mockImplementation((query: string) => ({ matches: query === '(display-mode: standalone)' })) as typeof window.matchMedia;

      expect(isStandaloneDisplayMode()).toBe(true);
    });

    it('returns false when neither navigator.standalone nor display-mode matches', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        configurable: true,
      });
      window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;

      expect(isStandaloneDisplayMode()).toBe(false);
    });

    it('returns false when matchMedia is not available', () => {
      Object.defineProperty(navigator, 'standalone', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
        configurable: true,
      });

      expect(isStandaloneDisplayMode()).toBe(false);
    });
  });
});
