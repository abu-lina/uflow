import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    // Build DOM: trigger in body, container with two buttons inside
    trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);

    container = document.createElement('div');
    button1 = document.createElement('button');
    button1.textContent = 'First';
    button2 = document.createElement('button');
    button2.textContent = 'Last';
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(trigger);
    document.body.removeChild(container);
  });

  it('captures focus on the first focusable element when opened', () => {
    trigger.focus();
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));
    expect(document.activeElement).toBe(button1);
  });

  it('restores focus to previously-focused element when unmounted', () => {
    trigger.focus();
    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));
    unmount();
    expect(document.activeElement).toBe(trigger);
  });

  it('falls back gracefully when trigger is no longer in DOM (does not throw, previous element not focused)', () => {
    // Use a separate trigger not managed by beforeEach, so we control its removal safely
    const orphanTrigger = document.createElement('button');
    orphanTrigger.textContent = 'Orphan';
    document.body.appendChild(orphanTrigger);
    orphanTrigger.focus();

    const ref = { current: container };
    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    // Remove orphanTrigger before unmount
    document.body.removeChild(orphanTrigger);

    // Should not throw even when the previously-focused element was removed
    expect(() => unmount()).not.toThrow();

    // Focus must NOT be on the removed element (it's been removed from DOM)
    expect(document.activeElement).not.toBe(orphanTrigger);
  });

  it('does not capture focus when isOpen is false', () => {
    trigger.focus();
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, false));
    expect(document.activeElement).toBe(trigger);
  });

  it('does not throw when container has no focusable children', () => {
    const emptyContainer = document.createElement('div');
    document.body.appendChild(emptyContainer);
    const ref = { current: emptyContainer };
    expect(() => renderHook(() => useFocusTrap(ref, true))).not.toThrow();
    document.body.removeChild(emptyContainer);
  });
});
