import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type MaxWidthVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
type FooterHeight = 'h-12' | 'h-16' | 'custom' | string;

interface PageContentWrapperProps {
  /**
   * The content to be wrapped
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the main container
   */
  className?: string;
  /**
   * Additional CSS classes for the content container
   */
  contentClassName?: string;
  /**
   * Maximum width variant for the content area
   * @default 'sm'
   */
  maxWidth?: MaxWidthVariant | string;
  /**
   * Whether to center content vertically
   * @default false
   */
  centerVertically?: boolean;
  /**
   * Footer height to account for when centering vertically
   * Prevents content from being centered behind the footer
   * @default 'h-16' - standard 64px footer
   */
  footerHeight?: FooterHeight;
  /**
   * Padding variant for the main container
   * @default 'default' - 16px padding from device edges (px-4)
   */
  padding?: 'none' | 'sm' | 'default' | 'lg' | 'responsive' | string;
  /**
   * Whether to render as main element or div
   * @default false - renders as div to avoid nested main elements
   */
  asMain?: boolean;
  /**
   * Whether to include mobile navigation spacing
   * @default false - should be true only for pages with regular mobile navbar
   */
  includeMobileNavSpacing?: boolean;
  /**
   * Whether to apply background with proper margins (respects footer margins)
   * @default false
   */
  hasBackground?: boolean;
}

// Max-width mapping for type safety and consistency
const maxWidthMap: Record<MaxWidthVariant, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-xs sm:max-w-md md:max-w-lg', // Default responsive
  md: 'max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl',
  lg: 'max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl',
  xl: 'max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl',
  '2xl': 'max-w-2xl sm:max-w-4xl md:max-w-6xl lg:max-w-7xl',
  full: 'max-w-full',
} as const;

// Footer height mapping
const footerHeightMap: Record<string, string> = {
  'h-12': 'pb-12', // 48px
  'h-16': 'pb-16', // 64px - default
  'subpage': 'pb-20', // 80px for subpage buttons
} as const;

// Padding mapping for consistent spacing - ensures proper padding from device edges with safe area support
const paddingMap = {
  none: 'px-0',
  sm: 'px-2',              // 8px mobile only (no safe area, minimal padding)
  default: 'px-safe',      // 16px minimum + safe area insets - STANDARD for all pages
  lg: 'px-6',              // 24px mobile (no safe area, legacy)
  responsive: 'px-safe-responsive', // 16px mobile, 20px tablet, 24px desktop + safe area insets
} as const;

/**
 * Reusable page content wrapper that provides consistent 16px padding from device edges
 * and proper spacing below header and above footer.
 * 
 * Features:
 * - Standard 16px left/right padding from device edges
 * - Proper layout structure without conflicting scroll containers
 * - Header and footer spacing management
 * - Type-safe max-width variants
 * - Forward ref support
 * - Renders as div by default to avoid nested main elements
 * 
 * Note: Scrolling is handled by the parent RootClientLayout main container
 * to prevent nested scroll areas that cause weird scrolling behavior.
 * 
 * @example
 * ```tsx
 * // Basic usage with standard 16px padding
 * <PageContentWrapper>
 *   <div className="flex flex-col gap-6">
 *     <h2>Page Title</h2>
 *     <form>...</form>
 *   </div>
 * </PageContentWrapper>
 * ```
 */
export const PageContentWrapper = forwardRef<HTMLDivElement, PageContentWrapperProps>(
  ({ 
    children, 
    className = '', 
    contentClassName = '',
    maxWidth = 'sm',
    centerVertically = false,
    footerHeight = 'h-16',
    padding = 'default',
    asMain = false,
    includeMobileNavSpacing = false,
    hasBackground = false,
    ...props
  }, ref) => {
    // Handle both predefined variants and custom strings
    const maxWidthClass = typeof maxWidth === 'string' && maxWidth in maxWidthMap 
      ? maxWidthMap[maxWidth as MaxWidthVariant]
      : maxWidth;
    
    // Handle padding variant or custom string
    const paddingClass = typeof padding === 'string' && padding in paddingMap
      ? paddingMap[padding as keyof typeof paddingMap]
      : padding;

    // Determine footer bottom padding class when centering vertically
    // If mobile nav spacing is enabled, use the unified pb-mobile-nav to respect real footer height + safe area
    const footerPaddingClass = centerVertically
      ? (includeMobileNavSpacing
          ? 'pb-mobile-nav'
          : (footerHeight
              ? (footerHeight in footerHeightMap 
                  ? footerHeightMap[footerHeight]
                  : footerHeight)
              : ''))
      : '';

    const containerProps = {
      className: cn(
        'flex flex-col gap-6 w-full',
        // Alignment: center vertically when needed, otherwise normal flow
        centerVertically 
          ? `justify-center items-center flex-1 ${footerPaddingClass}`
          : '',
        // Don't apply padding when hasBackground is true (content handles its own margins)
        !hasBackground && paddingClass,
        // Max width constraint (only apply if not full) and center container
        maxWidthClass !== 'max-w-full' && [maxWidthClass, 'mx-auto'],
        // Apply background with proper margins (respects footer margins)
        hasBackground && 'bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] rounded-t-2xl mx-6 sm:mx-8',
        // Mobile navigation spacing (only when not centering vertically; when centering, footerPaddingClass handles spacing)
        includeMobileNavSpacing && !centerVertically && 'mobile-nav-spacing',
        // Custom class names
        contentClassName,
        className
      ),
      ...props
    };

    // Use type assertion to handle the dynamic element types
    if (asMain) {
      return (
        <main {...containerProps} ref={ref as React.Ref<HTMLElement>}>
          {children}
        </main>
      );
    }

    return (
      <div {...containerProps} ref={ref}>
        {children}
      </div>
    );
  }
);

PageContentWrapper.displayName = 'PageContentWrapper';
