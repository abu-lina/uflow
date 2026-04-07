import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useScrollLock, _resetScrollLockForTesting } from '@/hooks/useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    _resetScrollLockForTesting();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    _resetScrollLockForTesting();
    document.body.style.overflow = '';
  });

  it('sets overflow hidden when isOpen becomes true', () => {
    renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not lock when isOpen is false', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('restores overflow when unmounted', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
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
    const { unmount } = renderHook(() => useScrollLock(true));
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });
});
