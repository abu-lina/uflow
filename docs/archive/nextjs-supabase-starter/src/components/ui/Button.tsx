import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-sans text-base font-medium transition-all duration-150 ease-out disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        secondary: 'bg-neutral-light hover:bg-neutral text-content',
        danger: 'bg-danger text-white hover:bg-danger-dark',
        outline: 'border border-border bg-background hover:bg-neutral-muted',
        ghost: 'hover:bg-neutral-muted',
      },
      size: {
        default: 'h-12 px-4 rounded-lg',
        sm: 'h-9 px-3 rounded-md text-sm',
        lg: 'h-14 px-6 rounded-xl',
        icon: 'size-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="-ml-1 mr-2 h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              />
            </svg>
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };











