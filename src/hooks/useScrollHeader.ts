'use client';

import { useEffect, useState } from 'react';

interface UseScrollHeaderOptions {
  /**
   * Whether to enable scroll detection
   * @default true
   */
  enabled?: boolean;
  /**
   * Minimum scroll distance from top before header can hide (in pixels)
   * @default 10
   */
  scrollThreshold?: number;
  /**
   * Minimum scroll delta to trigger visibility change (prevents jitter)
   * @default 8
   */
  minScrollDelta?: number;
  /**
   * Velocity threshold for fast scroll detection (px per frame)
   * @default 15
   */
  velocityThreshold?: number;
  /**
   * Required scroll up distance to show header (hysteresis)
   * @default 15
   */
  showThreshold?: number;
  /**
   * Buffer zone for bottom boundary (prevents flickering)
   * @default 50
   */
  bottomBuffer?: number;
  /**
   * Dependencies that should trigger re-initialization (e.g., when content loads)
   */
  dependencies?: unknown[];
}

/**
 * Reusable hook for scroll-based header visibility
 * 
 * Features:
 * - Velocity-aware behavior (fast scroll = immediate response)
 * - Smart container detection (main element or window)
 * - Hysteresis to prevent flickering
 * - Bottom boundary protection
 * - iOS rubber band effect protection
 * - Performance optimized with requestAnimationFrame
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { isHeaderVisible } = useScrollHeader();
 * 
 * return (
 *   <>
 *     <PageHeader title="My Page" isVisible={isHeaderVisible} />
 *     <PageContentWrapper>
 *       Your content here
 *     </PageContentWrapper>
 *   </>
 * );
 * ```
 * 
 * @example
 * ```tsx
 * // With dependencies (re-initialize when content loads)
 * const { data } = useQuery(...);
 * const { isHeaderVisible } = useScrollHeader({
 *   dependencies: [data]
 * });
 * ```
 */
export function useScrollHeader(options: UseScrollHeaderOptions = {}) {
  const {
    enabled = true,
    scrollThreshold = 10,
    minScrollDelta = 8,
    velocityThreshold = 15,
    showThreshold = 15,
    bottomBuffer = 50,
    dependencies = [],
  } = options;

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    let lastScrollY = 0;
    let lastScrollTime = Date.now();
    let ticking = false;
    let scrollContainer: HTMLElement | Window | null = null;
    let cleanupFn: (() => void) | null = null;
    let hideScrollY = 0;
    let pendingVisibility: boolean | null = null;
    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

    const getScrollY = (container: HTMLElement | Window): number => {
      if (container === window) {
        return window.scrollY;
      }
      return (container as HTMLElement).scrollTop;
    };

    const isNearBottom = (container: HTMLElement | Window, currentScrollY: number): boolean => {
      if (container === window) {
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
        return distanceFromBottom < bottomBuffer;
      }
      const element = container as HTMLElement;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
      return distanceFromBottom < bottomBuffer;
    };

    const updateHeaderVisibility = (currentScrollY: number, scrollDifference: number, velocity: number) => {
      // Clear any pending visibility changes
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = null;
      }

      // Always show header when at the top
      if (currentScrollY <= scrollThreshold) {
        if (pendingVisibility !== true) {
          pendingVisibility = true;
          // Immediate update when at top (no delay needed)
        setIsHeaderVisible(true);
        hideScrollY = 0;
        }
        return;
      }

      // Don't change header visibility when near bottom (prevents flickering)
      if (scrollContainer && isNearBottom(scrollContainer, currentScrollY)) {
        return;
      }

      // Velocity-aware hiding: faster scroll = more decisive hide
      if (scrollDifference > 0) {
        // Fast downward scroll: hide immediately
        if (velocity > velocityThreshold) {
          if (pendingVisibility !== false) {
            pendingVisibility = false;
          setIsHeaderVisible(false);
          hideScrollY = currentScrollY;
          }
          return;
        }
        // Slow downward scroll: hide after threshold with small delay for smoothness
        if (currentScrollY > scrollThreshold) {
          if (pendingVisibility !== false) {
            pendingVisibility = false;
            // Small delay prevents jitter on slow scrolls
            visibilityTimeout = setTimeout(() => {
          setIsHeaderVisible(false);
          if (hideScrollY === 0) {
            hideScrollY = currentScrollY;
              }
            }, 50);
          }
        }
        return;
      }

      // Show when scrolling up - velocity-aware
      if (scrollDifference < 0) {
        const scrollUpDistance = hideScrollY > 0 ? hideScrollY - currentScrollY : Math.abs(scrollDifference);
        // Fast upward scroll: show immediately
        if (Math.abs(velocity) > velocityThreshold) {
          if (pendingVisibility !== true) {
            pendingVisibility = true;
          setIsHeaderVisible(true);
          hideScrollY = 0;
          }
          return;
        }
        // Slow upward scroll: require threshold
        if (scrollUpDistance >= showThreshold || currentScrollY <= scrollThreshold + 20) {
          if (pendingVisibility !== true) {
            pendingVisibility = true;
            // Immediate show feels more responsive
          setIsHeaderVisible(true);
          hideScrollY = 0;
          }
        }
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!scrollContainer) {
            ticking = false;
            return;
          }

          const currentTime = Date.now();
          const currentScrollY = getScrollY(scrollContainer);
          const scrollDifference = currentScrollY - lastScrollY;
          const timeDelta = currentTime - lastScrollTime;
          
          // Calculate velocity (px per frame) normalized to 60fps
          const velocity = timeDelta > 0 ? scrollDifference / (timeDelta / 16.67) : 0;

          // Ignore tiny scroll movements (but allow fast movements)
          if (Math.abs(scrollDifference) < minScrollDelta && Math.abs(velocity) < velocityThreshold) {
            ticking = false;
            return;
          }

          updateHeaderVisibility(currentScrollY, scrollDifference, velocity);
          lastScrollY = currentScrollY;
          lastScrollTime = currentTime;
          ticking = false;
        });
        ticking = true;
      }
    };

    const attachScrollListener = () => {
      // Clean up previous listener if exists
      if (cleanupFn) {
        cleanupFn();
        cleanupFn = null;
      }

      // Try main element first (preferred - more performant)
      const mainElement = document.querySelector('main') as HTMLElement;
      
      if (mainElement && mainElement.scrollHeight > mainElement.clientHeight) {
        scrollContainer = mainElement;
        lastScrollY = mainElement.scrollTop;
        lastScrollTime = Date.now();
        mainElement.addEventListener('scroll', handleScroll, { passive: true });
        cleanupFn = () => {
          mainElement.removeEventListener('scroll', handleScroll);
        };
      } else {
        // Fallback to window scroll
        scrollContainer = window;
        lastScrollY = window.scrollY;
        lastScrollTime = Date.now();
        window.addEventListener('scroll', handleScroll, { passive: true });
        cleanupFn = () => {
          window.removeEventListener('scroll', handleScroll);
        };
      }
    };

    // Attach listener immediately
    attachScrollListener();

    // Re-attach after a delay (in case content loads later)
    const delayedAttach = setTimeout(() => {
      attachScrollListener();
    }, 500);

    return () => {
      clearTimeout(delayedAttach);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [enabled, scrollThreshold, minScrollDelta, velocityThreshold, showThreshold, bottomBuffer, ...dependencies]);

  return { isHeaderVisible };
}

