'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
  /**
   * The description's id for accessibility
   */
  id?: string;
}

export const FormDescription: React.FC<FormDescriptionProps> = ({ children, className, id }) => {
  return (
    <p className={cn('text-sm text-gray-500', className)} id={id}>
      {children}
    </p>
  );
};
