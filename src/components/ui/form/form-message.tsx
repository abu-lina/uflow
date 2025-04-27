'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface FormMessageProps {
  children: React.ReactNode;
  className?: string;
  /**
   * The message's id for accessibility
   */
  id?: string;
  /**
   * The message's type for styling and accessibility
   */
  type?: 'error' | 'success' | 'warning' | 'info';
}

export const FormMessage: React.FC<FormMessageProps> = ({
  children,
  className,
  id,
  type = 'info',
}) => {
  const typeStyles = {
    error: 'text-red-500 bg-red-50 border-red-200',
    success: 'text-green-500 bg-green-50 border-green-200',
    warning: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    info: 'text-blue-500 bg-blue-50 border-blue-200',
  };

  return (
    <p
      className={cn('rounded border p-2 text-sm', typeStyles[type], className)}
      id={id}
      role={type === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
};
