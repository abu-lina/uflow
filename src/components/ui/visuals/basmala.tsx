import React, { forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface BasmalaProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const Basmala = forwardRef<HTMLDivElement, BasmalaProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-2',
          {
            'w-32': size === 'sm',
            'w-48': size === 'md',
            'w-64': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {/* Existing SVG */}
        <svg
          fill="none"
          height="100%"
          viewBox="0 0 100 100"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ... existing SVG content ... */}
        </svg>

        {/* Text with gradient */}
        <p
          className={cn(
            'flex h-[18px] w-[369px] items-center justify-center',
            "text-center font-['Baskerville'] text-base font-normal leading-[18px]"
          )}
          style={{
            background:
              'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Im Namen Allahs des Allerbarmers, des Allbarmherzigen
        </p>
      </div>
    );
  }
);

Basmala.displayName = 'Basmala';

export { Basmala };
