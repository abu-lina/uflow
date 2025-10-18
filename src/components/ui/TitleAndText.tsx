import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TitleAndTextProps {
  /**
   * The title content - can be string or ReactNode for custom styling
   */
  title?: string | ReactNode;
  /**
   * The description/paragraph content - can be string or ReactNode for custom styling
   */
  description?: string | ReactNode;
  /**
   * Alternative: use children for more control over content structure
   */
  children?: ReactNode;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  /**
   * Additional CSS classes for the title element
   */
  titleClassName?: string;
  /**
   * Additional CSS classes for the description element
   */
  descriptionClassName?: string;
}

/**
 * Reusable Title + Paragraph component for consistent text sections.
 * 
 * Features:
 * - Title: text-3xl, center-aligned, uses content-title color (#232323)
 * - Description: text-base, center-aligned
 * - Fixed 8px gap between title and paragraph (space-y-2)
 * - Mobile-focused design
 * - Minimal div structure for better semantic HTML
 * 
 * @example
 * ```tsx
 * // Props-based usage (recommended)
 * <TitleAndText 
 *   title="Welcome to Ummah Flow"
 *   description="Discover Muslim offers near you insha'Allah."
 * />
 * 
 * // Children-based usage for custom content
 * <TitleAndText>
 *   <h2 className="custom-title">Custom Title</h2>
 *   <p className="custom-description">Custom description with special formatting</p>
 * </TitleAndText>
 * ```
 */
export function TitleAndText({
  title,
  description,
  children,
  className = '',
  titleClassName = '',
  descriptionClassName = '',
}: TitleAndTextProps) {
  // If children are provided, render them (for custom content control)
  if (children) {
    return (
      <div className={cn('space-y-2', className)}>
        {children}
      </div>
    );
  }

  // Default props-based rendering - minimal semantic structure
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h2 className={cn(
          'text-center text-3xl font-semibold leading-tight text-content-title',
          titleClassName
        )}>
          {title}
        </h2>
      )}
      {description && (
        <p className={cn(
          'text-center text-base leading-normal text-[#7A7A7A]',
          descriptionClassName
        )}>
          {description}
        </p>
      )}
    </div>
  );
}
