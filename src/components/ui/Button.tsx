import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from '@iconify/react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-inter-tight text-base font-medium transition-all duration-150 ease-out disabled:opacity-50 active:scale-[0.98] [&>span]:transition-colors [&>span]:duration-300 [&>span]:ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        secondary: 'bg-neutral-light hover:bg-neutral text-content-muted hover:text-content',
        success: 'bg-primary-dark hover:bg-primary-dark text-white',
        danger: 'bg-danger text-white hover:bg-danger-dark',
        cancel: 'bg-neutral-100 hover:bg-neutral-300 text-text-primary',
        gradient: 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500 text-white',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        tertiary: 'text-content-muted hover:text-content bg-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
        auth: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        action: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
      },
      size: {
        default: 'h-12 px-4 rounded-xl',
        sm: 'h-7 px-3 rounded-lg',
        md: 'h-10 px-5 rounded-md action-button-height',
        lg: 'h-14 px-6 rounded-xl',
        footer: 'h-14 px-5 rounded-xl',
        text: 'h-auto px-0 rounded-none',
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
  icon?: React.ReactNode | string; // Support both ReactNode and Iconify string (leading icon)
  trailingIcon?: React.ReactNode | string; // Trailing icon (after text)
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, icon, trailingIcon, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const hasText = loading ? (loadingText || children) : children;
    const isIconOnly = (icon || trailingIcon) && !hasText;
    
    // Render icon - support both ReactNode and Iconify string
    const renderIcon = (iconProp?: React.ReactNode | string) => {
      if (!iconProp || loading) return null;
      
      if (typeof iconProp === 'string') {
        return <Icon aria-hidden="true" className="h-6 w-6" icon={iconProp} />;
      }
      
      // For React components, don't constrain the size - let the component control its own size
      return iconProp;
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, fullWidth }), 
          isIconOnly ? 'gap-0' : 'gap-2',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {renderIcon(icon)}
        {(hasText || loading) && (
          <span className="text-center">
            {loading ? (loadingText || children) : children}
          </span>
        )}
        {renderIcon(trailingIcon)}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
