'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for detecting mobile viewport with consistent breakpoint
 * Uses Tailwind's md breakpoint (768px) to match responsive design
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  const checkMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768; // Tailwind's md breakpoint
  }, []);

  useEffect(() => {
    // Initial check
    setIsMobile(checkMobile());

    // Handle resize with throttling for better performance
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsMobile(checkMobile());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [checkMobile]);

  return isMobile;
}

/**
 * Hook for detecting small mobile viewport (640px - Tailwind's sm breakpoint)
 * Useful for components that need smaller mobile detection
 */
export function useIsSmallMobile() {
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  const checkSmallMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640; // Tailwind's sm breakpoint
  }, []);

  useEffect(() => {
    setIsSmallMobile(checkSmallMobile());

    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setIsSmallMobile(checkSmallMobile());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [checkSmallMobile]);

  return isSmallMobile;
}
