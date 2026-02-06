/**
 * ScrollablePageLayout
 * 
 * A layout container that enables the PageHeader blur/glass effect on scroll.
 * 
 * This component provides the proper scroll context for backdrop-filter to work.
 * Use this instead of the legacy PageLayout when you want the header blur effect.
 * 
 * Features:
 * - Automatic scroll detection for PageHeader via Context
 * - Proper stacking contexts for backdrop-filter
 * - Safe area handling
 * 
 * @example
 * ```tsx
 * <ScrollablePageLayout>
 *   <PageHeader title="My Page" variant="back-and-title" onBack="/" />
 *   <PageContent hasFooter>
 *     <YourContent />
 *   </PageContent>
 *   <FooterAction ... />
 * </ScrollablePageLayout>
 * ```
 */

'use client';

import { ReactNode, useRef, createContext, RefObject } from 'react';
import { cn } from '@/lib/utils';

interface ScrollablePageLayoutProps {
  /**
   * Child components (typically PageHeader + PageContent + FooterAction)
   */
  children: ReactNode;
  
  /**
   * Background gradient classes
   * @default 'bg-gradient-to-b from-neutral-50 to-neutral-50'
   */
  background?: string;
  
  /**
   * Additional CSS classes for the scroll container
   */
  className?: string;
}

/**
 * Context for sharing scroll container ref with PageHeader
 * This allows PageHeader to detect scroll without prop drilling
 */
export const ScrollContext = createContext<RefObject<HTMLDivElement> | null>(null);

/**
 * Layout container that provides the correct scroll context for PageHeader blur effects.
 * 
 * Structure:
 * - Absolute positioning with inset-0 (fills parent)
 * - overflow-y-auto for scrolling
 * - Provides scroll ref via Context to PageHeader
 * 
 * This ensures backdrop-filter works correctly by maintaining proper stacking contexts.
 * Uses Context API for clean, idiomatic React ref sharing.
 */
export function ScrollablePageLayout({
  children,
  background = 'bg-gradient-to-b from-neutral-50 to-neutral-50',
  className,
}: ScrollablePageLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className={cn(
          'absolute inset-0 overflow-y-auto',
          background,
          className
        )}
      >
        {children}
      </div>
    </ScrollContext.Provider>
  );
}

