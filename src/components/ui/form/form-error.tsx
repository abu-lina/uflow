'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface FormErrorProps {
  message: string;
  className?: string;
  /**
   * The error message's id for accessibility
   */
  id?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className, id }) => {
  return (
    <p className={cn('text-sm text-red-600', className)} id={id} role="alert">
      {message}
    </p>
  );
};
