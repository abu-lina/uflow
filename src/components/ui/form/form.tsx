'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  className?: string;
  /**
   * The form's name for accessibility
   */
  name?: string;
}

export const Form: React.FC<FormProps> = ({
  children,
  className,
  name,
  ...props
}) => {
  return (
    <form
      className={cn('space-y-4', className)}
      name={name}
      {...props}
    >
      {children}
    </form>
  );
}; 