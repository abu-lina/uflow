'use client';

import { forwardRef } from 'react';

import { Icon as IconifyIcon } from '@iconify/react';

interface IconProps extends React.ComponentProps<typeof IconifyIcon> {
  className?: string;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ className = '', ...props }, ref) => {
  return (
    <IconifyIcon
      ref={ref}
      className={className}
      {...props}
      onError={(error) => {
        console.error('Icon loading error:', error);
      }}
    />
  );
});

Icon.displayName = 'Icon';
