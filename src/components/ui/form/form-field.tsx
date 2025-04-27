'use client';

import React from 'react';

import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  description?: string;
  error?: string;
  label?: string;
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>((props, ref) => {
  const { children, className, description, error, label, required, ...rest } = props;
  const id = React.useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div
      ref={ref}
      {...rest}
      aria-describedby={error ? errorId : description ? descriptionId : undefined}
      aria-labelledby={label ? id : undefined}
      className={cn('space-y-2', className)}
      role="group"
    >
      {label && (
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor={id}
          id={id}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {description && (
        <p className="text-sm text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      )}
      <Slot>{children}</Slot>
      {error && (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
