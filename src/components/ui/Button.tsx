import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-inter-tight text-base font-medium',
  {
    variants: {
      variant: {
        default: 'bg-mint text-white',
        gradient: 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500 text-white',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-4 rounded-[9.60px]',
        sm: 'h-7 px-3',
        lg: 'h-9 px-6',
        icon: 'size-8',
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
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {icon && <div className="relative size-4">{icon}</div>}
        {children && <span className="text-center">{children}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
