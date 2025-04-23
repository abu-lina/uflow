import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface WhiteBoxProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the white box
   * @default 'default'
   */
  variant?: 'default' | 'elevated' | 'outlined';
  /**
   * Whether the box has padding
   * @default true
   */
  padded?: boolean;
}

/**
 * WhiteBox component that provides a clean, white background container
 * @example
 * ```tsx
 * <WhiteBox variant="elevated" padded={false}>
 *   <p>Content</p>
 * </WhiteBox>
 * ```
 */
const WhiteBox = forwardRef<HTMLDivElement, WhiteBoxProps>(
  ({ className, variant = 'default', padded = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg',
          {
            'shadow-sm': variant === 'default',
            'shadow-md': variant === 'elevated',
            'border border-gray-200': variant === 'outlined',
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

export default WhiteBox; 