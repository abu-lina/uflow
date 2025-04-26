'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormLabelProps {
  children: React.ReactNode;
  className?: string;
  /**
   * The label's id for accessibility
   */
  id?: string;
  /**
   * The id of the form control this label is for
   */
  htmlFor?: string;
  /**
   * Whether the form control is required
   */
  required?: boolean;
  /**
   * The label's description for accessibility
   */
  description?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  children,
  className,
  id,
  htmlFor,
  required,
  description
}) => {
  return (
    <div className="space-y-1">
      <label
        id={id}
        htmlFor={htmlFor}
        className={cn(
          'block text-sm font-medium text-gray-700 mb-1',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          className
        )}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p 
          className="text-sm text-gray-500"
          id={`${htmlFor}-description`}
        >
          {description}
        </p>
      )}
    </div>
  );
}; 