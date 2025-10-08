'use client';

import { useEffect, useState, useRef } from 'react';

interface UseContainerScrollOptions {
  /**
   * CSS selector for the scroll container
   * @default '.content-scroll-container'
   */
  containerSelector?: string;
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
   * Buffer zone for bottom boundary (iOS rubber band protection)
   * @default 50
   */
  boundaryBuffer?: number;
  /**
   * Delay before attaching scroll listener (helps with iOS initial scroll issues)
   * @default 100
   */
  initDelay?: number;
}

/**
 * Hook for detecting scroll direction in a specific container with iOS optimizations
 * 
 * Features:
 * - Hide header when scrolling down, show when scrolling up
 * - Always show at top of page
 * - iOS rubber band effect protection
 * - Jitter prevention with minimum delta
 * - Throttled with requestAnimationFrame for performance
 * 
 * @example
 * ```tsx
 * const { isHeaderVisible } = useContainerScroll();
 * 
 * return (
 *   <div className={`header ${isHeaderVisible ? 'show' : 'hide'}`}>
 *     ...
 *   </div>
 * );
 * ```
 */
export function useContainerScroll(options: UseContainerScrollOptions = {}) {
  const {
    containerSelector = '.content-scroll-container',
    scrollThreshold = 10,
    minScrollDelta = 8,
    boundaryBuffer = 50,
    initDelay = 100,
  } = options;

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);

  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector(containerSelector);
      const contentContainer = scrollContainerRef.current;

      if (!contentContainer) {
        console.warn(`useContainerScroll: Container not found with selector "${containerSelector}"`);
        return;
      }

      let ticking = false; // Throttle using requestAnimationFrame

      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;

            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < boundaryBuffer;

            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < minScrollDelta) {
              ticking = false;
              return;
            }

            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }

            // Always show header when at the top
            if (currentScrollY <= scrollThreshold) {
              setIsHeaderVisible(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderVisible(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderVisible(true);
            }

            lastScrollY.current = currentScrollY;
            ticking = false;
          });

          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, initDelay);

    return () => clearTimeout(timer);
  }, [containerSelector, scrollThreshold, minScrollDelta, boundaryBuffer, initDelay]);

  return { isHeaderVisible };
}

