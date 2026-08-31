import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useScrollLock, _resetScrollLockForTesting } from '@/hooks/useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    _resetScrollLockForTesting();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.removeAttribute('data-scroll-lock-count');
  });

  afterEach(() => {
    _resetScrollLockForTesting();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.removeAttribute('data-scroll-lock-count');
  });

  it('sets overflow hidden when isOpen becomes true', () => {
    renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('does not lock when isOpen is false', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores overflow when unmounted', () => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.documentElement.style.overflow).toBe('scroll');
  });

  it('stack-safe: two open hooks — closing one does NOT restore scroll', () => {
    const first = renderHook(() => useScrollLock(true));
    const second = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    first.unmount();
    // second is still open — overflow must remain hidden
    expect(document.body.style.overflow).toBe('hidden');
    second.unmount();
    // now both gone — restored
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores original overflow value (not hardcoded empty string)', () => {
    document.body.style.overflow = 'scroll';
    document.documentElement.style.overflow = 'auto';
    const { unmount } = renderHook(() => useScrollLock(true));
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('recovers stale DOM lock marker when hook mounts closed', () => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.setAttribute('data-scroll-lock-count', '1');

    renderHook(() => useScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.hasAttribute('data-scroll-lock-count')).toBe(false);
  });
});
