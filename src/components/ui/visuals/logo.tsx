'use client';

import { HTMLAttributes, forwardRef } from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The width of the logo in pixels
   * @default 48
   */
  width?: number;
  /**
   * The height of the logo in pixels
   * @default 48
   */
  height?: number;
  /**
   * The variant of the logo
   * @default 'default'
   */
  variant?: 'default' | 'monochrome';
}

/**
 * Logo component that displays the Ummah Flow logo
 * @example
 * ```tsx
 * <Logo width={48} height={48} variant="default" />
 * ```
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  ({ className, width = 48, height = 48, variant = 'default', ...props }, ref) => {
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
        style={{ width, height }}
        {...props}
      >
        <Image fill priority alt="Ummah Flow Logo" className="object-contain" src="/logo.svg" />
      </div>
    );
  }
);

Logo.displayName = 'Logo';
