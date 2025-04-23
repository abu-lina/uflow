import React from 'react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface BasmalaProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

const Basmala = forwardRef<HTMLDivElement, BasmalaProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
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
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ... existing SVG content ... */}
        </svg>

        {/* Text with gradient */}
        <p 
          style={{
            background: 'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          className={cn(
            "w-[369px] h-[18px] flex items-center justify-center",
            "font-['Baskerville'] text-base leading-[18px] font-normal text-center"
          )}
        >
          Im Namen Allahs des Allerbarmers, des Allbarmherzigen
        </p>
      </div>
    )
  }
)

Basmala.displayName = "Basmala"

export { Basmala } 