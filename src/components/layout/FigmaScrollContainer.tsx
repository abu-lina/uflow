/**
 * FigmaScrollContainer
 * 
 * @deprecated Use ScrollablePageLayout instead. This component will be removed in v2.0.
 * The "Figma" naming references implementation details rather than purpose.
 * 
 * Migration:
 * ```tsx
 * // Old
 * import { FigmaScrollContainer } from '@/components/layout';
 * <FigmaScrollContainer>...</FigmaScrollContainer>
 * 
 * // New (recommended)
 * import { ScrollablePageLayout } from '@/components/layout';
 * <ScrollablePageLayout>...</ScrollablePageLayout>
 * ```
 * 
 * See docs/SCROLLABLE_PAGE_LAYOUT.md for migration guide.
 */

'use client';

import { ScrollablePageLayout } from './ScrollablePageLayout';
import type { ReactNode } from 'react';

export interface FigmaScrollContainerProps {
  children: ReactNode;
  background?: string;
  className?: string;
}

/** @deprecated Use ScrollablePageLayout instead */
export function FigmaScrollContainer(props: FigmaScrollContainerProps) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'FigmaScrollContainer is deprecated. Use ScrollablePageLayout instead.\n' +
      'See docs/SCROLLABLE_PAGE_LAYOUT.md for migration guide.'
    );
  }
  
  return <ScrollablePageLayout {...props} />;
}
