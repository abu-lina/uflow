import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TitleSection } from './TitleSection';
import { ContentSection } from './ContentSection';

interface ContentLayoutProps {
  /**
   * The title/header section content (usually IconWithTitle or TitleAndText)
   */
  titleSection: ReactNode;
  /**
   * The form/actions section content (usually buttons, form inputs, etc.)
   */
  actionsSection: ReactNode;
  /**
   * Additional CSS classes for the main container
   */
  className?: string;
  /**
   * Additional CSS classes for the TitleSection wrapper
   */
  titleClassName?: string;
  /**
   * Additional CSS classes for the ContentSection wrapper
   */
  actionsClassName?: string;
}

/**
 * Reusable layout component for pages with title and actions sections.
 * 
 * This component encapsulates the common pattern used across pages:
 * - TitleSection with proper spacing and centering
 * - ContentSection with proper form/button layout
 * 
 * Replaces the repetitive pattern of:
 * ```tsx
 * <div className="flex w-full flex-col">
 *   <TitleSection className="mb-10">...</TitleSection>
 *   <ContentSection>...</ContentSection>
 * </div>
 * ```
 * 
 * @example
 * ```tsx
 * <PageContentWrapper centerVertically={true}>
 *   <ContentLayout
 *     titleSection={
 *       <IconWithTitle
 *         icon={<MailIcon />}
 *         title="Check Your Email"
 *       >
 *         <p>We sent you a confirmation email.</p>
 *       </IconWithTitle>
 *     }
 *     actionsSection={
 *       <div className="flex flex-col space-y-3">
 *         <Button>Resend Email</Button>
 *         <LinkButton>Change Email</LinkButton>
 *       </div>
 *     }
 *   />
 * </PageContentWrapper>
 * ```
 */
export function ContentLayout({
  titleSection,
  actionsSection,
  className = '',
  titleClassName = 'mb-10',
  actionsClassName = '',
}: ContentLayoutProps) {
  return (
    <div className={cn('flex w-full flex-col', className)}>
      {/* Title Section */}
      <TitleSection className={titleClassName}>
        {titleSection}
      </TitleSection>

      {/* Actions Section */}
      <ContentSection className={actionsClassName}>
        {actionsSection}
      </ContentSection>
    </div>
  );
}
