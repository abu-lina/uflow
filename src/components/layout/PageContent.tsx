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
  
  /**
   * Whether to vertically center content on desktop
   * @default false
   */
  centerVertically?: boolean;
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
  centerVertically = false,
}: PageContentProps) {
  const maxWidthClass = maxWidth === 'full' 
    ? '' // Don't apply max-w-full, let className handle it
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
        // Desktop: Header at top-20 (80px) + header height (24px padding + 48px content + 8px padding = 80px) = 160px bottom
        // Desktop: 32px gap = 192px total from top
        'pt-[calc(env(safe-area-inset-top)+160px)]',
        // Desktop: When centering vertically, use equal top/bottom spacing for perfect centering
        // Header: safe-area + 24px padding + 48px height + 8px bottom = safe-area + 80px  
        // Footer: ~68px (py-6 = 24px*2 + content ~20px)
        // For visual centering, use the larger value (80px) for both to ensure content doesn't overlap
        // Then flexbox will center the content in the remaining space
        centerVertically 
          ? 'md:pt-[calc(env(safe-area-inset-top)+80px)] md:pb-[80px] md:h-full md:flex md:items-center md:justify-center'
          : 'md:pt-[calc(env(safe-area-inset-top)+160px)]',
        paddingX,
        // When centering vertically, bottom padding is handled above
        centerVertically ? '' : bottomPadding,
        // Only apply className to main when maxWidth is not full
        maxWidth !== 'full' && className
      )}
    >
      <div className={cn(
        maxWidth !== 'full' && 'mx-auto',
        maxWidthClass,
        // When maxWidth is full, apply className to inner div for proper centering
        maxWidth === 'full' && className
      )}>
        {children}
      </div>
    </Component>
  );
}

