'use client';

import { cn } from '@/lib/utils';

interface HeaderSpacerProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable header spacer component that provides consistent spacing
 * below the fixed PageHeader component across all screen sizes.
 * 
 * Calculates proper spacing based on:
 * - Safe area inset top
 * - Header padding (16px mobile, 24px tablet+)
 * - Header height (40px mobile, 48px tablet, 56px desktop)
 * - Additional 32px gap for proper content spacing
 * Content is then vertically centered within the remaining space below this spacer
 * 
 * Uses Tailwind utilities for responsive spacing that matches the PageHeader height.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <HeaderSpacer />
 * 
 * // With custom classes
 * <HeaderSpacer className="border-t" />
 * ```
 */
export function HeaderSpacer({ className }: HeaderSpacerProps) {
  return (
    <div 
      aria-hidden="true"
      className={cn(
        'w-full flex-shrink-0 h-header-spacing sm:h-header-spacing-sm md:h-header-spacing-md',
        className
      )}
      role="presentation"
    />
  );
}

