import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-inter-tight text-base font-medium',
  {
    variants: {
      variant: {
        default: 'bg-mint text-white hover:bg-[#4a8a84]',
        primary: 'bg-[#589D96] text-white hover:bg-[#4a8a84] transition-colors disabled:opacity-50',
        gradient: 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500 text-white',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        auth: 'bg-[#589D96] text-white hover:bg-[#4a8a84] transition-colors disabled:opacity-50', // Auth button variant
      },
      size: {
        default: 'h-12 px-4 rounded-xl', // 48px height with base text
        sm: 'h-7 px-3 rounded-lg',
        lg: 'h-14 px-6 rounded-xl',
        footer: 'h-14 px-5 rounded-xl', // 56px height for footer buttons
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
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, icon, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        {...props}
      >
        {icon && !loading && <div className="relative size-4">{icon}</div>}
        <span className="text-center">
          {loading ? (loadingText || children) : children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
