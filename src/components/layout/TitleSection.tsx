import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TitleSectionProps {
  /**
   * The title and description content
   */
  children: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Maximum width for the title section
   */
  maxWidth?: string;
}

/**
 * Standardized title section with centered content.
 * 
 * This component is designed to work within PageContentWrapper and centers
 * the content (typically TitleAndText or IconWithTitle) with responsive spacing 
 * (24px mobile, 32px tablet+) and max-width constraints for optimal small screen display.
 * 
 * Note: No padding is applied here since PageContentWrapper handles the container padding.
 * 
 * @example
 * ```tsx
 * <PageContentWrapper>
 *   <TitleSection>
 *     <TitleAndText 
 *       title="Welcome Title"
 *       description="Description text"
 *     />
 *   </TitleSection>
 *   <ContentSection>
 *     // Form content
 *   </ContentSection>
 * </PageContentWrapper>
 * ```
 */
export function TitleSection({ 
  children, 
  className = '',
  maxWidth = 'max-w-xs sm:max-w-md md:max-w-lg'
}: TitleSectionProps) {
  return (
    <div className={cn('flex flex-col items-center gap-6 sm:gap-8 w-full', className)}>
      <div className={cn(
        'flex flex-col items-center w-full mx-auto',
        maxWidth
      )}>
        {children}
      </div>
    </div>
  );
}
