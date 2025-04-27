'use client';

import React from 'react';

import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The item's id for accessibility
   */
  id?: string;
  /**
   * The item's label for accessibility
   */
  label?: string;
  /**
   * The item's description for accessibility
   */
  description?: string;
  /**
   * The item's error message for accessibility
   */
  error?: string;
}

export function FormItem({ className, error, ...props }: FormItemProps) {
  return (
    <div className={cn('space-y-2', className)} role="group" {...props}>
      <Slot />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
