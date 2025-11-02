import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from '@iconify/react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-inter-tight text-base font-medium transition-all duration-150 ease-out disabled:opacity-50 active:scale-[0.98] [&>span]:transition-colors [&>span]:duration-300 [&>span]:ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-mint text-white hover:bg-[#4a8a84]',
        primary: 'bg-[#589D96] text-white hover:bg-[#4a8a84]',
        secondary: 'bg-[#EEEEEE] hover:bg-gray-300 text-[#CDCDCD]',
        success: 'bg-[#4a8a84] hover:bg-[#4a8a84] text-white',
        danger: 'bg-[#D86363] text-white hover:bg-[#B84F4F]',
        cancel: 'bg-[#EEEEEE] hover:bg-gray-300 text-[#232323]',
        gradient: 'bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500 text-white',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        auth: 'bg-[#589D96] text-white hover:bg-[#4a8a84]',
        action: 'bg-[#589D96] text-white hover:bg-teal-600',
      },
      size: {
        default: 'h-12 px-4 rounded-xl',
        sm: 'h-7 px-3 rounded-lg',
        md: 'h-10 px-5 rounded-md action-button-height',
        lg: 'h-14 px-6 rounded-xl',
        footer: 'h-14 px-5 rounded-xl',
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
  icon?: React.ReactNode | string; // Support both ReactNode and Iconify string
  loading?: boolean;
  loadingText?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, icon, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const hasText = loading ? (loadingText || children) : children;
    const isIconOnly = icon && !hasText;
    
    // Render icon - support both ReactNode and Iconify string
    const renderIcon = () => {
      if (!icon || loading) return null;
      
      if (typeof icon === 'string') {
        return <Icon aria-hidden="true" className="h-5 w-5" icon={icon} />;
      }
      
      // For React components, don't constrain the size - let the component control its own size
      return icon;
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
        {renderIcon()}
        {(hasText || loading) && (
          <span className="text-center">
            {loading ? (loadingText || children) : children}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
