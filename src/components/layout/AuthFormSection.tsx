import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthFormSectionProps {
  /**
   * The form content
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the form container
   */
  className?: string;
  /**
   * Whether to include mobile navigation spacing
   * @default false - PageContentWrapper already handles this
   */
  includeMobileSpacing?: boolean;
}

/**
 * Standardized form section for auth pages.
 * 
 * This component is designed to work within PageContentWrapper which provides
 * the base 16px padding from device edges and handles mobile navigation spacing.
 * Form fields within this section should extend to fill the available space 
 * with proper internal padding.
 * 
 * Note: 
 * - Mobile navigation spacing is handled by PageContentWrapper
 * - No overflow styles to avoid conflicting scroll areas with parent containers
 * 
 * @example
 * ```tsx
 * <PageContentWrapper>
 *   <TitleSection>
 *     <h2>Welcome Title</h2>
 *   </TitleSection>
 *   <AuthFormSection>
 *     <form>
 *       // Form fields extend to 16px from device edges
 *     </form>
 *   </AuthFormSection>
 * </PageContentWrapper>
 * ```
 */
export function AuthFormSection({ 
  children, 
  className = '',
  includeMobileSpacing = false // Default to false since PageContentWrapper handles this
}: AuthFormSectionProps) {
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
