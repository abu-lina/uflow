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
 * - Consistent 12px left padding (pl-3)
 * - Proper typography (Inter font, lg size, semibold weight)
 * - Bottom margin (mb-4) for spacing
 * - Left text alignment
 * - Customizable additional classes
 * 
 * @example
 * ```tsx
 * <SectionHeading>Persönliche Daten</SectionHeading>
 * 
 * // With custom class
 * <SectionHeading className="mt-8">Konto verwalten</SectionHeading>
 * ```
 */
export function SectionHeading({ 
  children, 
  className = ''
}: SectionHeadingProps) {
  return (
    <h2 className={cn(
      'mb-4 pl-3 text-left font-inter-tight text-lg font-semibold text-[#232323]',
      className
    )}>
      {children}
    </h2>
  );
}
