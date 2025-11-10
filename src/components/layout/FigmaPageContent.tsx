/**
 * FigmaPageContent
 * 
 * @deprecated Use PageContent instead. This component will be removed in v2.0.
 * The "Figma" naming references implementation details rather than purpose.
 * 
 * Migration:
 * ```tsx
 * // Old
 * import { FigmaPageContent } from '@/components/layout';
 * <FigmaPageContent>...</FigmaPageContent>
 * 
 * // New (recommended)
 * import { PageContent } from '@/components/layout';
 * <PageContent>...</PageContent>
 * ```
 * 
 * See docs/SCROLLABLE_PAGE_LAYOUT.md for migration guide.
 */

import { PageContent } from './PageContent';
import type { ReactNode } from 'react';

export interface FigmaPageContentProps {
  children: ReactNode;
  maxWidth?: 'full' | '361px' | '480px' | '640px';
  paddingX?: string;
  paddingBottom?: string;
  hasFooter?: boolean;
  className?: string;
  asMain?: boolean;
}

/** @deprecated Use PageContent instead */
export function FigmaPageContent(props: FigmaPageContentProps) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'FigmaPageContent is deprecated. Use PageContent instead.\n' +
      'See docs/SCROLLABLE_PAGE_LAYOUT.md for migration guide.'
    );
  }
  
  return <PageContent {...props} />;
}
