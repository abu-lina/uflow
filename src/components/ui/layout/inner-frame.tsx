'use client';

import { HTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface InnerFrameProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const InnerFrame = forwardRef<HTMLDivElement, InnerFrameProps>(
  ({ className, maxWidth = 'lg', padding = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto w-full',
          maxWidthClasses[maxWidth],
          paddingClasses[padding],
          className
        )}
        {...props}
      />
    );
  }
);

InnerFrame.displayName = 'InnerFrame';
