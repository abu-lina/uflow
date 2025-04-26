'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormItemProps {
  children: React.ReactNode;
  className?: string;
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

export const FormItem: React.FC<FormItemProps> = ({
  children,
  className,
  id,
  label,
  description,
  error
}) => {
  return (
    <div
      id={id}
      className={cn('space-y-2', className)}
      role="group"
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-errormessage={error ? `${id}-error` : undefined}
      aria-invalid={!!error}
    >
      {label && (
        <label
          id={`${id}-label`}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      {description && (
        <p
          id={`${id}-description`}
          className="text-sm text-gray-500"
        >
          {description}
        </p>
      )}
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-red-500"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}; 