import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';
import { useAriaHidden } from '@/hooks/useAriaHidden';

describe('useAriaHidden', () => {
  let container: HTMLDivElement;
  let sibling1: HTMLDivElement;
  let sibling2: HTMLDivElement;

  beforeEach(() => {
    // Set up: container in body (simulates portal root), plus siblings
    container = document.createElement('div');
    sibling1 = document.createElement('div');
    sibling2 = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(sibling1);
    document.body.appendChild(sibling2);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(sibling1);
    document.body.removeChild(sibling2);
  });

  it('marks body siblings as aria-hidden when isOpen is true', () => {
    const ref = { current: container };
    renderHook(() => useAriaHidden(ref, true));
    expect(sibling1.getAttribute('aria-hidden')).toBe('true');
    expect(sibling2.getAttribute('aria-hidden')).toBe('true');
  });

  it('does NOT mark the portal container as aria-hidden', () => {
    const ref = { current: container };
    renderHook(() => useAriaHidden(ref, true));
    expect(container.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('does not modify anything when isOpen is false', () => {
    const ref = { current: container };
    renderHook(() => useAriaHidden(ref, false));
    expect(sibling1.hasAttribute('aria-hidden')).toBe(false);
    expect(sibling2.hasAttribute('aria-hidden')).toBe(false);
  });

  it('restores prior aria-hidden values on cleanup', () => {
    sibling1.setAttribute('aria-hidden', 'true'); // already had it
    sibling2.removeAttribute('aria-hidden'); // did not have it
    const ref = { current: container };
    const { unmount } = renderHook(() => useAriaHidden(ref, true));
    unmount();
    expect(sibling1.getAttribute('aria-hidden')).toBe('true');
    expect(sibling2.hasAttribute('aria-hidden')).toBe(false);
  });

  it('removes aria-hidden from siblings on cleanup (when they had none before)', () => {
    const ref = { current: container };
    const { unmount } = renderHook(() => useAriaHidden(ref, true));
    expect(sibling1.getAttribute('aria-hidden')).toBe('true');
    unmount();
    expect(sibling1.hasAttribute('aria-hidden')).toBe(false);
  });

  it('does not throw when containerRef.current is null', () => {
    const ref = { current: null };
    expect(() => renderHook(() => useAriaHidden(ref, true))).not.toThrow();
  });
});
