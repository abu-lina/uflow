'use client';

import { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import { Size } from '@/types/shared';

import { LoadingSpinner } from './loading-spinner';

interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
  spinnerSize?: Size;
  blur?: boolean;
  text?: string;
}

export const LoadingOverlay = ({
  loading = true,
  spinnerSize = 'lg',
  blur = true,
  text,
  className,
  children,
  ...props
}: LoadingOverlayProps) => {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center',
          'bg-white/50',
          blur && 'backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <LoadingSpinner size={spinnerSize} />
        {text && <p className="mt-4 text-sm font-medium text-gray-600">{text}</p>}
      </div>
    </div>
  );
};
