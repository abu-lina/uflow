import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetFeatureFlag = vi.fn();
const mockGetOnboardingState = vi.fn();
const mockSetOnboardingState = vi.fn();

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => mockGetFeatureFlag(key),
}));

vi.mock('@/lib/utils/onboarding-state', () => ({
  getOnboardingState: () => mockGetOnboardingState(),
  setOnboardingState: (...args: unknown[]) => mockSetOnboardingState(...args),
}));

import { useOnboardingGate } from '@/hooks/useOnboardingGate';

describe('useOnboardingGate', () => {
  let localStorageMock: Record<string, string>;
  let sessionStorageMock: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};
    sessionStorageMock = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] ?? sessionStorageMock[key] ?? null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ready: true immediately when isAppLaunched is true', () => {
    mockGetFeatureFlag.mockImplementation((key: string) => key === 'isAppLaunched');

    const { result } = renderHook(() => useOnboardingGate());

    expect(result.current.ready).toBe(true);
    expect(result.current.isRecovering).toBe(false);
  });

  it('returns ready: true when earlyAccess + city are present', () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue({ earlyAccessUnlocked: true });
    localStorageMock['selectedCity'] = 'Berlin';

    const { result } = renderHook(() => useOnboardingGate());

    expect(result.current.ready).toBe(true);
    expect(result.current.city).toBe('Berlin');
  });

  it('returns ready: false when earlyAccess is true but no city', () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue({ earlyAccessUnlocked: true });

    const { result } = renderHook(() => useOnboardingGate());

    expect(result.current.ready).toBe(false);
    expect(result.current.city).toBeNull();
  });

  it('returns ready: false when no earlyAccess and no city', () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue(null);

    const { result } = renderHook(() => useOnboardingGate());

    expect(result.current.ready).toBe(false);
  });

  it('skipWaitlist: true + city selected -> ready: true, skips earlyAccess check', () => {
    mockGetFeatureFlag.mockImplementation((key: string) => key === 'skipWaitlist');
    mockGetOnboardingState.mockReturnValue(null);
    localStorageMock['selectedCity'] = 'Munich';

    const { result } = renderHook(() => useOnboardingGate());

    // skipWaitlist treats hasEarlyAccess as true, so no recovery needed.
    // Only city selection is required.
    expect(result.current.ready).toBe(true);
    expect(result.current.city).toBe('Munich');
    expect(result.current.isRecovering).toBe(false);
  });

  it('recovery: calls /api/waitlist/status when city exists but no earlyAccess', async () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue(null);
    localStorageMock['selectedCity'] = 'Berlin';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { email: 'test@test.com' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useOnboardingGate());

    // Should be recovering initially
    expect(result.current.isRecovering).toBe(true);

    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });

    expect(result.current.ready).toBe(true);
    expect(result.current.city).toBe('Berlin');
    expect(fetchSpy).toHaveBeenCalledWith('/api/waitlist/status');
    expect(mockSetOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@test.com', earlyAccessUnlocked: true }),
    );

    fetchSpy.mockRestore();
  });

  it('recovery: returns ready: false when API returns no email', async () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue(null);
    localStorageMock['selectedCity'] = 'Berlin';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useOnboardingGate());

    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });

    expect(result.current.ready).toBe(false);
    fetchSpy.mockRestore();
  });

  it('recovery: returns ready: false when API call fails', async () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue(null);
    localStorageMock['selectedCity'] = 'Berlin';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useOnboardingGate());

    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });

    expect(result.current.ready).toBe(false);
    fetchSpy.mockRestore();
  });

  it('reads city from sessionStorage when localStorage has none', () => {
    mockGetFeatureFlag.mockReturnValue(false);
    mockGetOnboardingState.mockReturnValue({ earlyAccessUnlocked: true });
    // localStorage has no selectedCity, but sessionStorage does.
    // Our mock returns sessionStorage value when localStorage returns null.
    sessionStorageMock['selectedCity'] = 'Hamburg';

    const { result } = renderHook(() => useOnboardingGate());

    expect(result.current.ready).toBe(true);
    expect(result.current.city).toBe('Hamburg');
  });
});
