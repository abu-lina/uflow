/**
 * DesktopCreateLayout
 * 
 * A desktop-optimized layout container for the create flow.
 * Provides wider content area, better spacing, and proper scroll context.
 * 
 * Features:
 * - Desktop-optimized max-width (960px)
 * - Proper spacing and padding for desktop screens
 * - Scroll context for PageHeader blur effects
 * - Works seamlessly with PageContent component
 * 
 * @example
 * ```tsx
 * <DesktopCreateLayout>
 *   <PageHeader title="Create" variant="back-and-title" onBack="/" />
 *   <PageContent maxWidth="full" paddingX="px-0">
 *     <div className="max-w-[960px] mx-auto px-6 md:px-8">
 *       <FormContent />
 *     </div>
 *   </PageContent>
 * </DesktopCreateLayout>
 * ```
 */

'use client';

import { ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollContext } from './ScrollablePageLayout';

interface DesktopCreateLayoutProps {
  /**
   * Child components (typically PageHeader + PageContent + FooterAction)
   */
  children: ReactNode;
  
  /**
   * Background gradient classes
   * @default 'bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]'
   */
  background?: string;
  
  /**
   * Additional CSS classes for the scroll container
   */
  className?: string;
}

/**
 * Desktop-optimized layout container for create flow pages.
 * 
 * Structure:
 * - Absolute positioning with inset-0 (fills parent)
 * - overflow-y-auto for scrolling
 * - Provides scroll ref via Context to PageHeader
 * - Works with PageContent for proper spacing
 * 
 * This ensures backdrop-filter works correctly by maintaining proper stacking contexts.
 * The actual content width is controlled by PageContent and its children.
 */
export function DesktopCreateLayout({
  children,
  background = 'bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]',
  className,
}: DesktopCreateLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className={cn(
          'absolute inset-0 overflow-y-auto',
          'z-0', // Ensure it's below footer (footer has z-10)
          background,
          className
        )}
      >
        {children}
      </div>
    </ScrollContext.Provider>
  );
}

