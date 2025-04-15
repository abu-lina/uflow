import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
        header: 'border border-gray-light text-gray-dark hover:border-primary transition-colors',
        headerLogo: 'text-2xl font-bold text-gray-dark hover:text-primary transition-colors',
        framed: 'border border-gray-light text-gray-dark hover:border-primary',
        unframed: 'text-gray-dark hover:bg-gray-50',
        chevron: 'text-gray-dark hover:bg-gray-50',
        action: 'bg-primary text-white hover:bg-primary/90',
        highlight: 'bg-primary text-white hover:bg-primary/90',
        search: 'bg-white border border-gray-light text-gray-400',
        location: 'bg-white border border-gray-light',
      },
      size: {
        default: 'h-[40px] px-[14px] text-sm rounded-[12px]',
        sm: 'h-[36px] px-3 text-sm rounded-[12px]',
        lg: 'h-[44px] px-8 text-base rounded-[12px]',
        action: 'h-[56px] px-[20px] text-[16px] font-medium rounded-[12px]',
        icon: 'h-[40px] w-[40px] rounded-[12px]',
        header: 'h-[48px] px-3 text-[16px] font-medium rounded-lg',
        headerLogo: 'h-[48px]',
        search: 'h-[40px] px-[14px] text-sm rounded-[12px]',
        location: 'h-[40px] w-[40px] rounded-[12px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  showChevron?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, showChevron = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showChevron && (
          <ChevronDown className="ml-1 h-4 w-4" />
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants }; 