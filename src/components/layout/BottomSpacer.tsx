'use client';

import { cn } from '@/lib/utils';

interface BottomSpacerProps {
  /**
   * Whether the bottom action bar is visible
   * @default true
   */
  isVisible?: boolean;
  /**
   * Height variant of the bottom action bar
   * @default 'h-16'
   */
  height?: 'h-12' | 'h-16' | 'subpage';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable bottom spacer component that provides consistent spacing
 * above fixed bottom navigation components across all screen sizes.
 * 
 * Calculates proper spacing based on:
 * - Bottom action bar height (48px for h-12, 64px for h-16, 80px for subpage)
 * - Safe area inset bottom for devices with home indicators
 * - Additional padding for proper content spacing (1rem + max(12px, safe-area))
 * 
 * This ensures content is properly vertically centered when using
 * centerVertically in PageContentWrapper, accounting for fixed bottom navs.
 * 
 * @example
 * ```tsx
 * // Basic usage (always visible)
 * <BottomSpacer />
 * 
 * // With height variant for BottomActionNavbar
 * <BottomSpacer height="h-16" />
 * 
 * // For subpage buttons (RootClientLayout style)
 * <BottomSpacer height="subpage" />
 * 
 * // With visibility control
 * <BottomSpacer isVisible={showBottomNav} />
 * ```
 */
export function BottomSpacer({ 
  isVisible = true, 
  height = 'h-16',
  className 
}: BottomSpacerProps) {
  // Use Tailwind utilities for consistent spacing
  const heightClass = height === 'h-12' 
    ? 'h-bottom-spacing-12' 
    : height === 'subpage' 
    ? 'h-bottom-spacing-subpage'
    : 'h-bottom-spacing-16';

  return (
    <div 
      aria-hidden="true"
      className={cn(
        'w-full flex-shrink-0 transition-all duration-300',
        isVisible ? heightClass : 'h-0 opacity-0',
        className
      )}
      role="presentation"
    />
  );
}
