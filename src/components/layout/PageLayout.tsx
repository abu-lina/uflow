import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type MaxWidthVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface PageLayoutProps {
  /**
   * The content to be rendered
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the root container
   */
  className?: string;
  /**
   * Maximum width variant for the page container
   * @default 'sm'
   */
  maxWidth?: MaxWidthVariant | string;
  /**
   * Whether to apply the default background gradient
   * @default true
   */
  hasBackground?: boolean;
  /**
   * Whether to use full screen height
   * @default true
   */
  fullHeight?: boolean;
}

// Responsive max-width mapping following the existing patterns
const maxWidthMap: Record<MaxWidthVariant, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl', // Default responsive pattern
  md: 'max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl',
  lg: 'max-w-lg lg:max-w-2xl xl:max-w-4xl',
  xl: 'max-w-xl xl:max-w-4xl',
  '2xl': 'max-w-2xl xl:max-w-4xl',
  full: 'max-w-full',
} as const;

/**
 * Reusable page layout component that provides consistent structure and styling.
 * 
 * This component eliminates nested container issues and provides a clean,
 * maintainable layout foundation for all pages. It replaces the complex nested
 * div structure that was causing DOM bloat and inconsistent styling.
 * 
 * **Before (Complex nested structure):**
 * ```tsx
 * <div className="relative flex h-screen w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl mx-auto flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
 *   <PageHeader />
 *   <HeaderSpacer />
 *   <main className="flex flex-1 flex-col items-center justify-between px-4">
 *     <div className="flex w-full max-w-xs sm:max-w-md md:max-w-lg flex-1 flex-col items-center gap-6 overflow-y-auto">
 *       // Content goes here
 *     </div>
 *   </main>
 * </div>
 * ```
 * 
 * **After (Clean single container):**
 * ```tsx
 * <PageLayout maxWidth="sm">
 *   <PageHeader />
 *   <HeaderSpacer />
 *   <PageContentWrapper>
 *     // Content goes here
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 * 
 * **Benefits:**
 * - Reduces DOM nesting depth by 2-3 levels
 * - Eliminates duplicate background gradient declarations
 * - Provides consistent responsive max-width patterns
 * - Type-safe max-width variants prevent styling errors
 * - Single source of truth for layout structure
 * - Easier to maintain and update globally
 * 
 * @example
 * ```tsx
 * // Basic usage with default responsive max-width
 * <PageLayout>
 *   <PageHeader title="Login" variant="title-and-icon" />
 *   <PageContentWrapper>
 *     <LoginForm />
 *   </PageContentWrapper>
 * </PageLayout>
 * 
 * // Custom max-width and no background
 * <PageLayout maxWidth="lg" hasBackground={false}>
 *   <PageHeader title="Dashboard" />
 *   <PageContentWrapper>
 *     <DashboardContent />
 *   </PageContentWrapper>
 * </PageLayout>
 * ```
 */
export const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ 
    children, 
    className = '',
    maxWidth = 'sm',
    hasBackground = true,
    fullHeight = true,
    ...props
  }, ref) => {
    // Handle both predefined variants and custom strings
    const maxWidthClass = typeof maxWidth === 'string' && maxWidth in maxWidthMap 
      ? maxWidthMap[maxWidth as MaxWidthVariant]
      : maxWidth;

    return (
      <div
        ref={ref}
        className={cn(
          // Base layout classes
          'relative w-full mx-auto flex-col',
          // Height handling
          fullHeight ? 'flex h-screen' : 'flex min-h-screen',
          // Max-width handling
          maxWidthClass,
          // Background handling
          hasBackground && 'bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';
