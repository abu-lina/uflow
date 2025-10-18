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
 * Standardized title section for auth pages that handles the specific 
 * padding requirements: 28px left padding, 16px right padding.
 * 
 * This component is designed to work within PageContentWrapper which provides
 * the base 16px padding from device edges.
 * 
 * @example
 * ```tsx
 * <PageContentWrapper>
 *   <AuthTitleSection>
 *     <h2>Welcome Title</h2>
 *     <p>Description text</p>
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
        'flex flex-col items-start pl-[12px] w-full mx-auto',
        maxWidth
      )}>
        {children}
      </div>
    </div>
  );
}
