'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface DelayedUnmountResult {
  shouldRender: boolean;
  isAnimating: boolean;
}

export function useDelayedUnmount(
  isOpen: boolean,
  durationMs = 300,
): DelayedUnmountResult {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Clear any pending unmount timer when re-opening
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShouldRender(true);
    } else {
      const delay = prefersReducedMotion() ? 0 : durationMs;
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        timerRef.current = null;
      }, delay);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, durationMs]);

  return {
    shouldRender,
    isAnimating: isOpen,
  };
}
