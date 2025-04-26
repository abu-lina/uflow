'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface OrnamentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The size of the ornament in pixels
   * @default 24
   */
  size?: number;
  /**
   * The variant of the ornament
   * @default 'default'
   */
  variant?: 'default' | 'monochrome';
  /**
   * The aria-label for accessibility
   * @default 'Ornament'
   */
  'aria-label'?: string;
}

/**
 * Ornament component that displays decorative elements
 * @example
 * ```tsx
 * <Ornament size={24} variant="default" aria-label="Star ornament" />
 * ```
 */
export const Ornament = forwardRef<HTMLDivElement, OrnamentProps>(
  ({ 
    className, 
    size = 24, 
    variant = 'default',
    'aria-label': ariaLabel = 'Ornament',
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          {
            'text-primary': variant === 'default',
            'text-gray-900': variant === 'monochrome',
          },
          className
        )}
        style={{ width: size, height: size }}
        role="img"
        aria-label={ariaLabel}
        {...props}
      >
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }
);

Ornament.displayName = 'Ornament'; 