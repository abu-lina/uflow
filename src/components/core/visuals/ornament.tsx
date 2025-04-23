import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface OrnamentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the ornament
   * @default 'default'
   */
  variant?: 'default' | 'star' | 'circle';
  /**
   * The size of the ornament in pixels
   * @default 24
   */
  size?: number;
  /**
   * Whether the ornament is active
   * @default false
   */
  isActive?: boolean;
}

/**
 * Ornament component that displays decorative elements
 * @example
 * ```tsx
 * <Ornament variant="star" size={24} isActive={true} />
 * ```
 */
const Ornament = forwardRef<HTMLDivElement, OrnamentProps>(
  ({ className, variant = 'default', size = 24, isActive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          {
            'text-primary': isActive,
            'text-gray-300': !isActive,
          },
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        {variant === 'default' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        )}
        {variant === 'star' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        )}
        {variant === 'circle' && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </div>
    );
  }
);

Ornament.displayName = 'Ornament';

export default Ornament; 