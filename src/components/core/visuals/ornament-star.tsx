import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface OrnamentStarProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the star is active
   * @default false
   */
  isActive?: boolean;
}

export const OrnamentStar = forwardRef<HTMLDivElement, OrnamentStarProps>(
  ({ className, isActive = false, ...props }, ref) => {
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
        {...props}
      >
        <svg
          width="11"
          height="10"
          viewBox="0 0 11 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 0L6.8 3.4L10.5 3.4L7.4 5.5L8.7 8.9L5.5 6.8L2.3 8.9L3.6 5.5L0.5 3.4L4.2 3.4L5.5 0Z" />
        </svg>
      </div>
    );
  }
);

OrnamentStar.displayName = 'OrnamentStar'; 