import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type MaxWidthVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

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

// Padding mapping for consistent spacing - ensures 16px from device edges on mobile
const paddingMap = {
  none: 'px-0',
  sm: 'px-2',              // 8px mobile only
  default: 'px-4',         // 16px mobile - STANDARD for all pages
  lg: 'px-6',              // 24px mobile
  responsive: 'px-4 sm:px-5 md:px-6', // 16px mobile, 20px tablet, 24px desktop
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
    padding = 'default',
    asMain = false,
    includeMobileNavSpacing = false,
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

    const containerProps = {
      className: cn(
        'flex flex-1 flex-col items-center min-h-0',
        paddingClass,
        centerVertically ? 'justify-center' : 'justify-start',
        className
      ),
      ...props
    };

    const contentDiv = (
      <div className={cn(
        'flex w-full gap-6',
        includeMobileNavSpacing && 'mobile-nav-spacing',
        centerVertically ? 'flex-1 flex-col justify-center items-center min-h-full' : 'flex-col flex-shrink-0',
        maxWidthClass,
        contentClassName
      )}>
        {children}
      </div>
    );

    // Use type assertion to handle the dynamic element types
    if (asMain) {
      return (
        <main {...containerProps} ref={ref as React.Ref<HTMLElement>}>
          {contentDiv}
        </main>
      );
    }

    return (
      <div {...containerProps} ref={ref}>
        {contentDiv}
      </div>
    );
  }
);

PageContentWrapper.displayName = 'PageContentWrapper';
