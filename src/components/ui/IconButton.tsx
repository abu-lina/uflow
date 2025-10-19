import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 flex-shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[#589D96] text-white hover:bg-[#4a8a84]',
        secondary: 'bg-[#EEEEEE] text-[#CDCDCD] hover:bg-gray-300',
        success: 'bg-[#4a8a84] text-white hover:bg-[#4a8a84]',
      },
      size: {
        sm: 'h-8 w-8',   // 32px
        md: 'h-10 w-10', // 40px  
        lg: 'h-12 w-12', // 48px
        xl: 'h-14 w-14', // 56px
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'lg',
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode;
  'aria-label': string;
  loading?: boolean;
}

/**
 * Simple icon-only button component
 * 
 * Features:
 * - Perfect 1:1 ratio (square buttons)
 * - Automatically centers the icon
 * - Icon passed as React.ReactNode (supports any size)
 * - No gap or spacing issues
 * - Clean, focused API
 * 
 * @example
 * ```tsx
 * <IconButton 
 *   variant="secondary" 
 *   size="lg" 
 *   aria-label="Delete item"
 *   onClick={handleDelete}
 * >
 *   <Trash2 className="h-6 w-6" />
 * </IconButton>
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, disabled, loading, ...props }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <button
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
