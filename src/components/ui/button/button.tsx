import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'unframed' | 'framed' | 'highlight' | 'action' | 'search' | 'location';
  size?: 'sm' | 'md' | 'lg' | 'default' | 'action' | 'search' | 'location';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Base variants
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            
            // Header specific variants
            'bg-transparent hover:bg-transparent hover:text-primary': variant === 'unframed',
            'border border-primary text-primary hover:bg-primary/10': variant === 'framed',
            'bg-primary text-white hover:bg-primary/90': variant === 'highlight',
            'bg-action text-white hover:bg-action/90': variant === 'action',
            'bg-white border border-gray-light hover:bg-gray-50': variant === 'search' || variant === 'location',
          },
          {
            // Base sizes
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md' || size === 'default',
            'h-11 px-8 text-lg': size === 'lg',
            
            // Header specific sizes
            'h-12 px-6 py-3': size === 'action',
            'h-12 px-4': size === 'search',
            'h-12 w-12 p-0': size === 'location',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button'; 