'use client';

interface HeaderSpacerProps {
  /**
   * Whether the header is visible (for scroll-based hiding)
   * @default true
   */
  isVisible?: boolean;
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
 * - Additional gap (16px)
 * 
 * @example
 * ```tsx
 * // Basic usage (always visible)
 * <HeaderSpacer />
 * 
 * // With scroll-based visibility
 * const { isHeaderVisible } = useContainerScroll();
 * <HeaderSpacer isVisible={isHeaderVisible} />
 * ```
 */
export function HeaderSpacer({ isVisible = true, className = '' }: HeaderSpacerProps) {
  return (
    <div 
      aria-hidden="true"
      className={`transition-all duration-300 ${
        isVisible ? 'header-spacer' : 'h-0 opacity-0'
      } ${className}`}
      role="presentation"
    />
  );
}

