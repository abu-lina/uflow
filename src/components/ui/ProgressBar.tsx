'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Optional additional CSS classes
   */
  className?: string;
  /**
   * Enable shimmer animation (default: true)
   * Automatically disabled when prefers-reduced-motion is active
   */
  showShimmer?: boolean;
  /**
   * Minimum value for accessibility (default: 0)
   */
  min?: number;
  /**
   * Maximum value for accessibility (default: 100)
   */
  max?: number;
}

/**
 * ProgressBar Component
 * 
 * Animated progress bar with shimmer effect and smooth transitions.
 * Respects prefers-reduced-motion for accessibility.
 * 
 * Design tokens:
 * - Background: #D7D7D7 (matches design spec)
 * - Active fill: primary color (#589D96)
 * - Height: 32px (h-8)
 * - Border radius: 12px (rounded-md)
 * - Transition: 500ms ease-out
 */
const FIRST_VISIT_KEY = 'uflow-progress-bar-first-visit';

export function ProgressBar({
  value,
  className,
  showShimmer = true,
  min = 0,
  max = 100,
}: ProgressBarProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [shouldShowShimmer, setShouldShowShimmer] = useState(showShimmer);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [animatedValue, setAnimatedValue] = useState(0);

  // Clamp value between min and max
  const clampedValue = Math.min(Math.max(value, min), max);
  const targetPercentage = ((clampedValue - min) / (max - min)) * 100;

  // Check if this is the first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY) === 'true';
    setIsFirstVisit(!hasVisited);

    // Mark as visited after checking
    if (!hasVisited) {
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    }
  }, []);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    setShouldShowShimmer(showShimmer && !mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      setShouldShowShimmer(showShimmer && !e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [showShimmer]);

  // Animate from 0 to target value only on first visit
  useEffect(() => {
    // Wait for first visit check to complete
    if (isFirstVisit === null) return;

    // If not first visit or reduced motion, show value directly
    if (!isFirstVisit || prefersReducedMotion) {
      setAnimatedValue(targetPercentage);
      return;
    }

    // First visit: animate from 0 to target value
    let interval: ReturnType<typeof setInterval> | null = null;

    // Start animation after a short delay (matches HTML example)
    const startDelay = setTimeout(() => {
      let currentValue = 0;
      const increment = 1; // Increment by 1% each step
      const intervalDuration = 50; // 50ms per step (matches HTML example)

      interval = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetPercentage) {
          currentValue = targetPercentage;
          setAnimatedValue(currentValue);
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        } else {
          setAnimatedValue(currentValue);
        }
      }, intervalDuration);
    }, 500); // 500ms delay before starting (matches HTML example)

    return () => {
      clearTimeout(startDelay);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [targetPercentage, prefersReducedMotion, isFirstVisit]);

  // Calculate current percentage for display
  // On first visit, use animated value; otherwise show target directly
  const currentPercentage = 
    isFirstVisit === null 
      ? 0 // Initial state while checking
      : (!isFirstVisit || prefersReducedMotion) 
        ? targetPercentage 
        : animatedValue;
  const currentValue = min + (currentPercentage / 100) * (max - min);

  return (
    <div
      aria-label={`Progress: ${Math.round(currentPercentage)}%`}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={Math.round(currentValue)}
      className={cn(
        'relative h-8 w-full overflow-hidden rounded-md',
        'bg-[#D7D7D7]', // Matches design spec exactly
        className
      )}
      role="progressbar"
    >
      {/* Progress Active Fill */}
      <div
        className={cn(
          'relative h-full rounded-md bg-primary',
          'transition-all duration-500 ease-out',
          'overflow-hidden',
          prefersReducedMotion && 'duration-0' // Instant transition for reduced motion
        )}
        style={{ width: `${currentPercentage}%` }}
      >
        {/* Shimmer Effect */}
        {shouldShowShimmer && (
          <div
            aria-hidden="true"
            className={cn(
              'absolute top-0 left-0 h-full w-full',
              'animate-shimmer',
              'bg-gradient-to-r from-transparent via-white/30 to-transparent'
            )}
          />
        )}
      </div>
    </div>
  );
}

