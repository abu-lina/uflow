import React, { forwardRef, Fragment, type ButtonHTMLAttributes } from 'react';

// Third-party imports
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

// Local imports
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 hover:text-primary',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
        surface: 'bg-gray-50 text-gray-900 hover:bg-gray-100',
        signin: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
        about: 'text-gray-900 hover:bg-gray-100',
        register: 'bg-primary text-white hover:bg-primary/90',
        'surface-extended-fab':
          'w-[94px] h-10 px-[14px] rounded-[12px] flex flex-row items-center justify-center font-inter-tight font-medium text-base leading-[19px] text-primary bg-background text-center shadow-none border-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
        extended: 'h-10 px-4', // Changed from 3.5 to 4 (16px) to follow Rule of 8
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, isLoading = false, size, variant, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      // Enforce a single React element child in development
      if (
        process.env.NODE_ENV !== 'production' &&
        (!children ||
          Array.isArray(children) ||
          typeof children !== 'object' ||
          (children as React.ReactElement).type === Fragment)
      ) {
        throw new Error('[Button asChild] expects a single React element child.');
      }
    }
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {children}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
