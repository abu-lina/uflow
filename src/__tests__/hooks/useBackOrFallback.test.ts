// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const back = vi.fn();
const push = vi.fn();
let pathname = '/p/1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, push }),
  usePathname: () => pathname,
}));

// The in-app flag is module state; load a fresh copy per test.
async function load() {
  vi.resetModules();
  return import('@/hooks/useBackOrFallback');
}

describe('useBackOrFallback (#986)', () => {
  beforeEach(() => {
    back.mockClear();
    push.mockClear();
    pathname = '/p/1';
  });

  it('direct entry falls back to /food', async () => {
    const { useBackOrFallback, useTrackInAppNavigation } = await load();
    renderHook(() => useTrackInAppNavigation());
    const { result } = renderHook(() => useBackOrFallback());

    result.current();

    expect(push).toHaveBeenCalledWith('/food');
    expect(back).not.toHaveBeenCalled();
  });

  it('external referrer is not treated as in-app history', async () => {
    Object.defineProperty(document, 'referrer', {
      value: 'https://www.google.com/',
      configurable: true,
    });
    const { useBackOrFallback, useTrackInAppNavigation } = await load();
    renderHook(() => useTrackInAppNavigation());
    const { result } = renderHook(() => useBackOrFallback());

    result.current();

    expect(push).toHaveBeenCalledWith('/food');
    expect(back).not.toHaveBeenCalled();
  });

  it('in-app entry goes back', async () => {
    pathname = '/food';
    const { useBackOrFallback, useTrackInAppNavigation } = await load();
    const tracker = renderHook(() => useTrackInAppNavigation());
    pathname = '/p/1';
    tracker.rerender();
    const { result } = renderHook(() => useBackOrFallback());

    result.current();

    expect(back).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
