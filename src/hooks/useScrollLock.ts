'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
const SCROLL_LOCK_ATTR = 'data-scroll-lock-count';

function clearScrollLockStyles() {
  document.body.style.overflow = originalBodyOverflow;
  document.documentElement.style.overflow = originalHtmlOverflow;
  originalBodyOverflow = '';
  originalHtmlOverflow = '';
  document.body.removeAttribute(SCROLL_LOCK_ATTR);
}

export function useScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) {
      const domLockCount = Number(document.body.getAttribute(SCROLL_LOCK_ATTR) ?? '0');

      // Dev/HMR safety: recover when module state resets but DOM is still locked.
      if (lockCount === 0 && domLockCount > 0) {
        clearScrollLockStyles();
      }

      return;
    }

    if (lockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    lockCount++;
    document.body.setAttribute(SCROLL_LOCK_ATTR, String(lockCount));

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        clearScrollLockStyles();
      } else {
        document.body.setAttribute(SCROLL_LOCK_ATTR, String(lockCount));
      }
    };
  }, [isOpen]);
}

/** Exported for test environment reset only — do not call in production code. */
export function _resetScrollLockForTesting(): void {
  lockCount = 0;
  originalBodyOverflow = '';
  originalHtmlOverflow = '';
}
