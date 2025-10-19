import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentSectionProps {
  /**
   * The content (forms, buttons, actions, etc.)
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Whether to include mobile navigation spacing
   * @default false - PageContentWrapper already handles this
   */
  includeMobileSpacing?: boolean;
}

/**
 * Standardized content section for pages.
 * 
 * This component is designed to work within PageContentWrapper which provides
 * the base 16px padding from device edges and handles mobile navigation spacing.
 * Content within this section should extend to fill the available space 
 * with proper internal padding.
 * 
 * Used for forms, action buttons, or any other content sections.
 * 
 * @example
 * ```tsx
 * <PageContentWrapper>
 *   <TitleSection>
 *     <h2>Welcome Title</h2>
 *   </TitleSection>
 *   <ContentSection>
 *     <div className="flex flex-col space-y-3">
 *       <Button>Action Button</Button>
 *       <LinkButton>Link</LinkButton>
 *     </div>
 *   </ContentSection>
 * </PageContentWrapper>
 * ```
 */
export function ContentSection({ 
  children, 
  className = '',
  includeMobileSpacing = false // Default to false since PageContentWrapper handles this
}: ContentSectionProps) {
  return (
    <div className={cn(
      'flex w-full flex-col gap-6',
      includeMobileSpacing && 'mobile-nav-spacing',
      className
    )}>
      {children}
    </div>
  );
}
