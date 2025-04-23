import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InnerFrameProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'narrow' | 'wide';
}

const InnerFrame = forwardRef<HTMLDivElement, InnerFrameProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto w-full',
          {
            'max-w-7xl': variant === 'default',
            'max-w-4xl': variant === 'narrow',
            'max-w-[90rem]': variant === 'wide',
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

InnerFrame.displayName = 'InnerFrame';

export default InnerFrame; 