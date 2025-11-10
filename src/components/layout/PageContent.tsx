/**
 * PageContent
 * 
 * Main content wrapper for pages using ScrollablePageLayout.
 * Provides consistent spacing, max-width, and safe area handling.
 * 
 * Use this component inside ScrollablePageLayout to ensure proper
 * spacing below the header and above the footer.
 * 
 * @example
 * ```tsx
 * <ScrollablePageLayout>
 *   <PageHeader title="My Page" variant="back-and-title" onBack="/" />
 *   <PageContent hasFooter>
 *     <h1>Content here</h1>
 *   </PageContent>
 *   <FooterAction ... />
 * </ScrollablePageLayout>
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps {
  /**
   * Child components
   */
  children: ReactNode;
  
  /**
   * Maximum width for content
   * @default '361px'
   */
  maxWidth?: 'full' | '361px' | '480px' | '640px';
  
  /**
   * Horizontal padding
   * @default 'px-6'
   */
  paddingX?: string;
  
  /**
   * Bottom padding (accounts for footer if present)
   * @default 'pb-8'
   */
  paddingBottom?: string;
  
  /**
   * Whether to add extra padding for a fixed footer
   * Set to true when using FooterAction component
   * @default false
   */
  hasFooter?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to render as <main> element
   * @default true
   */
  asMain?: boolean;
}

/**
 * Content wrapper that provides proper spacing below PageHeader and above FooterAction.
 * 
 * Top padding accounts for:
 * - Safe area inset (notch on mobile)
 * - Header height (88px = 64px content + 24px padding)
 * 
 * Bottom padding accounts for:
 * - Footer height if present (80px + safe area)
 * - Default spacing otherwise
 */
export function PageContent({
  children,
  maxWidth = '361px',
  paddingX = 'px-6',
  paddingBottom = 'pb-8',
  hasFooter = false,
  className,
  asMain = true,
}: PageContentProps) {
  const maxWidthClass = maxWidth === 'full' 
    ? 'max-w-full' 
    : maxWidth === '361px'
    ? 'max-w-[361px]'
    : maxWidth === '480px'
    ? 'max-w-[480px]'
    : 'max-w-[640px]';

  const bottomPadding = hasFooter 
    ? 'pb-[calc(80px+24px+env(safe-area-inset-bottom))]' 
    : paddingBottom;

  const Component = asMain ? 'main' : 'div';

  return (
    <Component
      className={cn(
        // Top padding: safe area + header height (88px)
        'pt-[calc(env(safe-area-inset-top)+88px)]',
        paddingX,
        bottomPadding,
        className
      )}
    >
      <div className={cn('mx-auto', maxWidthClass)}>
        {children}
      </div>
    </Component>
  );
}

