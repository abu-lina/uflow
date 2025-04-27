import React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { LoadingSpinner } from '@/components/shared/common/LoadingSpinner';
import { cn } from '@/lib/utils';

/**
 * Button variant styles using Tailwind CSS
 * @see https://ui.shadcn.com/docs/components/button
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-md text-sm font-medium',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:pointer-events-none',
    'ring-offset-background',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600 text-white',
          'hover:bg-primary-700',
          'active:bg-primary-800',
          'focus-visible:ring-primary-500',
        ].join(' '),
        secondary: [
          'bg-secondary-600 text-white',
          'hover:bg-secondary-700',
          'active:bg-secondary-800',
          'focus-visible:ring-secondary-500',
        ].join(' '),
        outline: [
          'border border-input',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-accent',
        ].join(' '),
        ghost: ['hover:bg-accent hover:text-accent-foreground', 'focus-visible:ring-accent'].join(
          ' '
        ),
        link: [
          'text-primary-600 hover:text-primary-700',
          'underline-offset-4 hover:underline',
          'focus-visible:ring-primary-500',
        ].join(' '),
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
      },
      isLoading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      isLoading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, the button will show a loading state
   */
  isLoading?: boolean;
  /**
   * The icon to display before the button text
   */
  leftIcon?: React.ReactNode;
  /**
   * The icon to display after the button text
   */
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { children, className, disabled, isLoading, leftIcon, rightIcon, size, variant, ...rest } =
    props;

  return (
    <button
      ref={ref}
      aria-busy={isLoading}
      className={cn(buttonVariants({ variant, size, isLoading, className }))}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span aria-hidden="true" className="mr-2">
          <LoadingSpinner size="sm" />
        </span>
      )}
      {!isLoading && leftIcon && (
        <span aria-hidden="true" className="mr-2">
          {leftIcon}
        </span>
      )}
      {children}
      {!isLoading && rightIcon && (
        <span aria-hidden="true" className="ml-2">
          {rightIcon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants };
