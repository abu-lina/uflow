'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

export function useScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
        originalOverflow = '';
      }
    };
  }, [isOpen]);
}

/** Exported for test environment reset only — do not call in production code. */
export function _resetScrollLockForTesting(): void {
  lockCount = 0;
  originalOverflow = '';
}
