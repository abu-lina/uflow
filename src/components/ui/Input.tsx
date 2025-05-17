import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, type, id, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-2">
        {label && (
          <label
            className="text-uFlowDarkGrey w-full text-left font-[inter] text-base font-normal"
            htmlFor={id}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'outline-uFlowDarkGrey h-0 w-full bg-transparent outline outline-[0.5px] outline-offset-[-0.25px]',
            error && 'outline-red-500',
            className,
          )}
          id={id}
          type={type}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
