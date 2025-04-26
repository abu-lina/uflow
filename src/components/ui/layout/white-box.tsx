'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface WhiteBoxProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the box has padding
   * @default true
   */
  padded?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  border?: boolean;
}

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg'
};

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full'
};

/**
 * WhiteBox component that provides a clean, white background container
 * @example
 * ```tsx
 * <WhiteBox variant="elevated" padded={false}>
 *   <p>Content</p>
 * </WhiteBox>
 * ```
 */
export const WhiteBox = forwardRef<HTMLDivElement, WhiteBoxProps>(
  ({ className, padded = true, children, shadow = 'md', rounded = 'md', border = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white',
          shadowClasses[shadow],
          roundedClasses[rounded],
          border && 'border',
          {
            'p-6': padded,
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

WhiteBox.displayName = 'WhiteBox'; 