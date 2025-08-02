'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'tel' | 'url' | 'file';
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {}

const baseFieldStyles = {
  input:
    'h-10 w-full rounded-[15px] border border-[#D4D4D4] bg-white px-4 font-inter text-[15px] text-[#272727] outline-none transition-colors focus:border-[#BFDBD8] focus:ring-1 focus:ring-[#BFDBD8]',
  textarea:
    'h-[160px] w-full rounded-[15px] border border-[#D4D4D4] bg-white p-4 font-inter text-[15px] text-[#272727] outline-none transition-colors focus:border-[#BFDBD8] focus:ring-1 focus:ring-[#BFDBD8]',
  label: 'px-3 font-inter text-base text-[#999999]',
  error: 'mt-1 text-sm text-red-500',
};

export const FormField = {
  Input: forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, error, required, className, id, ...props }, ref) => {
      return (
        <div className="flex w-full flex-col items-start gap-2">
          <label className={baseFieldStyles.label} htmlFor={id}>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <input
            ref={ref}
            className={cn(baseFieldStyles.input, error && 'border-red-500', className)}
            id={id}
            required={required}
            {...props}
          />
          {error && <p className={baseFieldStyles.error}>{error}</p>}
        </div>
      );
    },
  ),

  Textarea: forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
    ({ label, error, required, className, id, ...props }, ref) => {
      return (
        <div className="flex w-full flex-col items-start gap-2">
          <label className={baseFieldStyles.label} htmlFor={id}>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <textarea
            ref={ref}
            className={cn(baseFieldStyles.textarea, error && 'border-red-500', className)}
            id={id}
            required={required}
            {...props}
          />
          {error && <p className={baseFieldStyles.error}>{error}</p>}
        </div>
      );
    },
  ),
};

// Add display names for linter
FormField.Input.displayName = 'FormFieldInput';
FormField.Textarea.displayName = 'FormFieldTextarea';
