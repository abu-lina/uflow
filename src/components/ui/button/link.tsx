import { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'unframed' | 'framed' | 'highlight' | 'action' | 'search' | 'location';
type ButtonSize = 'sm' | 'md' | 'lg' | 'default' | 'action' | 'search' | 'location';

interface ButtonLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, href, children, variant = 'primary', size = 'md' }, ref) => {
    return (
      <Link 
        href={href} 
        className={cn(
          "inline-flex items-center justify-center",
          "rounded-lg",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
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
      >
        <span 
          className={cn(
            "text-base font-medium",
            "text-foreground",
            "flex items-center"
          )}
        >
          {children}
        </span>
      </Link>
    );
  }
);

ButtonLink.displayName = 'ButtonLink'; 