'use client';

import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest('[hidden]'),
  );
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Capture the previously focused element for restoration
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus to the first focusable element or the container itself
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableNow = getFocusableElements(container);
      if (focusableNow.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusableNow[0];
      const last = focusableNow[focusableNow.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on or before first, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on or after last, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeydown);

    return () => {
      container.removeEventListener('keydown', handleKeydown);

      // Restore focus to previously focused element if still in DOM
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        document.body.focus();
      }
    };
  }, [isOpen, containerRef]);
}
