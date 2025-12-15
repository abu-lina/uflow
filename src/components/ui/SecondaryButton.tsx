import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const secondaryButtonVariants = cva(
  'inline-flex items-center justify-center font-inter-tight text-base font-medium rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        text: 'bg-transparent border-border text-content-muted hover:text-content hover:bg-gray-50',
        'with-icon': 'bg-transparent border-border text-content-muted hover:text-content hover:bg-gray-50 gap-2',
      },
      size: {
        base: 'h-12 px-4', // 48px height with base text
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'text',
      size: 'base',
      fullWidth: false,
    },
  },
);

export interface SecondaryButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof secondaryButtonVariants> {
  /**
   * Icon to display as leading icon (24px) - only used with variant="with-icon"
   */
  leadingIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

/**
 * Secondary button component with two variants:
 * 1. text - No leading icon, just text
 * 2. with-icon - Leading icon (24px) + text
 * 
 * Features:
 * - Both variants use size base (48px height)
 * - Consistent secondary styling with hover states
 * - Accessible button semantics
 * - Loading and disabled states
 * 
 * @example
 * ```tsx
 * import { Icon } from '@/components/ui';
 * 
 * // Text variant (no icon)
 * <SecondaryButton variant="text" onClick={handleClick}>
 *   Cancel
 * </SecondaryButton>
 * 
 * // With icon variant (24px leading icon)
 * <SecondaryButton 
 *   variant="with-icon"
 *   leadingIcon={<Icon icon="material-symbols:mail-outline" className="h-6 w-6" />}
 *   onClick={handleClick}
 * >
 *   Send Email
 * </SecondaryButton>
 * ```
 */
const SecondaryButton = forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    leadingIcon, 
    loading = false, 
    loadingText, 
    children, 
    disabled, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <button
        ref={ref}
        className={cn(secondaryButtonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        {...props}
      >
        {variant === 'with-icon' && leadingIcon && !loading && (
          <span className="flex items-center justify-center w-6 h-6">
            {leadingIcon}
          </span>
        )}
        <span className="text-center">
          {loading ? (loadingText || children) : children}
        </span>
      </button>
    );
  },
);

SecondaryButton.displayName = 'SecondaryButton';

export { SecondaryButton, secondaryButtonVariants };
