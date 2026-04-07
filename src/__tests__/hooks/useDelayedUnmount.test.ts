import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';

describe('useDelayedUnmount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shouldRender is true when isOpen is true', () => {
    const { result } = renderHook(() => useDelayedUnmount(true));
    expect(result.current.shouldRender).toBe(true);
  });

  it('isAnimating is true when isOpen is true', () => {
    const { result } = renderHook(() => useDelayedUnmount(true));
    expect(result.current.isAnimating).toBe(true);
  });

  it('shouldRender stays true during exit delay after isOpen → false', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDelayedUnmount(isOpen, 300),
      { initialProps: { isOpen: true } },
    );
    rerender({ isOpen: false });
    // Before delay expires — still rendered
    expect(result.current.shouldRender).toBe(true);
    expect(result.current.isAnimating).toBe(false);
  });

  it('shouldRender becomes false after the delay expires', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDelayedUnmount(isOpen, 300),
      { initialProps: { isOpen: true } },
    );
    rerender({ isOpen: false });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.shouldRender).toBe(false);
  });

  it('cancels the timer if isOpen goes back to true during exit delay', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDelayedUnmount(isOpen, 300),
      { initialProps: { isOpen: true } },
    );
    rerender({ isOpen: false });
    act(() => {
      vi.advanceTimersByTime(100); // partially through delay
    });
    rerender({ isOpen: true });
    act(() => {
      vi.advanceTimersByTime(300); // rest of original delay
    });
    // Should still be rendering because we re-opened
    expect(result.current.shouldRender).toBe(true);
    expect(result.current.isAnimating).toBe(true);
  });

  it('uses 0ms delay (immediate unmount) when prefers-reduced-motion is set', () => {
    // Mock matchMedia to return reduce
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result, rerender } = renderHook(
      ({ isOpen }) => useDelayedUnmount(isOpen, 300),
      { initialProps: { isOpen: true } },
    );
    rerender({ isOpen: false });
    // With reduced motion, no timer needed — should be false immediately
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.shouldRender).toBe(false);

    window.matchMedia = original;
  });

  it('shouldRender is false from start when isOpen begins as false', () => {
    const { result } = renderHook(() => useDelayedUnmount(false));
    expect(result.current.shouldRender).toBe(false);
    expect(result.current.isAnimating).toBe(false);
  });
});
