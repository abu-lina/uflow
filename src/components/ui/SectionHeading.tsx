import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  /**
   * The heading text content
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the heading
   */
  className?: string;
}

/**
 * Reusable section heading component with consistent styling.
 * 
 * Features:
 * - Proper typography (Inter font, lg size, semibold weight)
 * - Bottom margin (mb-4) for spacing
 * - Left text alignment (no padding - completely inline left)
 * - Customizable additional classes
 * 
 * @example
 * ```tsx
 * <SectionHeading>Persönliche Daten</SectionHeading>
 * 
 * // With custom class
 * <SectionHeading className="mt-8 pl-3">Konto verwalten</SectionHeading>
 * ```
 */
export function SectionHeading({ 
  children, 
  className = ''
}: SectionHeadingProps) {
  return (
    <h2 className={cn(
      'mb-4 text-left font-inter-tight text-lg font-semibold text-content-heading',
      className
    )}>
      {children}
    </h2>
  );
}
