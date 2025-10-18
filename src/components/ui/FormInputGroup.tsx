import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormInputGroupProps {
  /**
   * The input fields to be grouped together
   */
  children: ReactNode;
  /**
   * Gap between input fields
   * - 'gap-3': 12px (recommended for forms)
   * - 'gap-4': 16px (default)
   * - Custom gap classes can also be provided
   */
  gap?: 'gap-3' | 'gap-4' | string;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * Reusable container component for grouping multiple FormInput components
 * with consistent spacing.
 * 
 * This component ensures proper spacing between form inputs and maintains
 * consistent layout patterns across the application.
 * 
 * Features:
 * - Flexible gap control (default: gap-4, recommended: gap-3 for 12px)
 * - Proper flex layout with full width
 * - Extensible className support for custom styling
 * 
 * @example
 * ```tsx
 * // Default gap (16px)
 * <FormInputGroup>
 *   <FormInput label="Email" type="email" />
 *   <FormInput label="Password" type="password" variant="with-icon" />
 * </FormInputGroup>
 * 
 * // Custom 12px gap
 * <FormInputGroup gap="gap-3">
 *   <FormInput label="First Name" type="text" />
 *   <FormInput label="Last Name" type="text" />
 * </FormInputGroup>
 * 
 * // Custom styling
 * <FormInputGroup className="mb-6" gap="gap-2">
 *   <FormInput label="Phone" type="tel" />
 *   <FormInput label="Address" type="text" />
 * </FormInputGroup>
 * ```
 */
export function FormInputGroup({
  children,
  gap = 'gap-4',
  className = '',
}: FormInputGroupProps) {
  return (
    <div className={cn(
      'flex w-full flex-col',
      gap,
      className
    )}>
      {children}
    </div>
  );
}
