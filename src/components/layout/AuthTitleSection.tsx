import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthTitleSectionProps {
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
 * Standardized title section for auth pages with centered content.
 * 
 * This component is designed to work within PageContentWrapper and centers
 * the content (typically TitleAndText) with proper spacing and max-width constraints.
 * 
 * @example
 * ```tsx
 * <PageContentWrapper>
 *   <AuthTitleSection>
 *     <TitleAndText 
 *       title="Welcome Title"
 *       description="Description text"
 *     />
 *   </AuthTitleSection>
 *   <AuthFormSection>
 *     // Form content
 *   </AuthFormSection>
 * </PageContentWrapper>
 * ```
 */
export function AuthTitleSection({ 
  children, 
  className = '',
  maxWidth = 'max-w-xs sm:max-w-md md:max-w-lg'
}: AuthTitleSectionProps) {
  return (
    <div className={cn('flex flex-col items-center gap-8 w-full', className)}>
      <div className={cn(
        'flex flex-col items-center w-full mx-auto px-4',
        maxWidth
      )}>
        {children}
      </div>
    </div>
  );
}
