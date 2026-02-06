import React, { forwardRef, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 flex-shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-darker',
        secondary: 'bg-neutral-100 text-neutral-400 hover:bg-neutral-300',
        success: 'bg-primary-dark text-white hover:bg-primary-dark',
      },
      size: {
        sm: 'h-8 w-8',   // 32px
        md: 'h-10 w-10', // 40px  
        lg: 'h-12 w-12', // 48px
        xl: 'h-14 w-14', // 56px
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'lg',
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode | string; // Support both ReactNode and Iconify string
  'aria-label': string;
  loading?: boolean;
}

/**
 * Simple icon-only button component
 * 
 * Features:
 * - Perfect 1:1 ratio (square buttons)
 * - Automatically centers the icon
 * - Icon passed as React.ReactNode (supports any size)
 * - No gap or spacing issues
 * - Clean, focused API
 * 
 * @example
 * ```tsx
 * <IconButton 
 *   variant="secondary" 
 *   size="lg" 
 *   aria-label="Delete item"
 *   onClick={handleDelete}
 * >
 *   <Trash2 className="h-6 w-6" />
 * </IconButton>
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, disabled, loading, onClick, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const internalRef = useRef<HTMLButtonElement | null>(null);
    
    // Combine forwarded ref with internal ref using callback ref pattern
    const setRef = (element: HTMLButtonElement | null) => {
      internalRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = element;
      }
    };
    
    // Render icon - support both ReactNode and Iconify string
    const renderIcon = () => {
      if (loading) {
        return <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />;
      }
      
      if (typeof icon === 'string') {
        // Use text-content-heading for the icon color (#232323)
        return <Icon aria-hidden="true" className="h-5 w-5 pointer-events-none text-content-heading" icon={icon} />;
      }
      
      // Wrap ReactNode icons to prevent click propagation issues
      // The pointer-events-none ensures clicks always hit the button, not child SVG elements
      // Use text-content-heading for the icon color (#232323)
      if (icon) {
        return (
          <span className="pointer-events-none flex items-center justify-center text-content-heading" style={{ pointerEvents: 'none' }}>
            {icon}
          </span>
        );
      }
      
      return null;
    };

    // Handle click with proper event handling to prevent issues with injected code
    // This ensures clicks are always handled at the button level, not child elements
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent event from bubbling to document-level listeners that might
      // try to access className.split() on child SVG elements
      e.stopPropagation();
      onClick?.(e);
    };

    // Use useEffect to ensure child SVG elements have safe className handling
    // This is a defensive measure against injected code that tries to access className.split()
    useEffect(() => {
      const buttonElement = internalRef.current;
      if (!buttonElement) return;

      // Find all SVG elements within the button and ensure they have className as string
      const svgElements = buttonElement.querySelectorAll('svg');
      svgElements.forEach((svg) => {
        // Ensure className is always a string (not DOMTokenList)
        // This prevents errors when injected code tries to call className.split()
        if (svg.className && typeof svg.className !== 'string') {
          const classList = Array.from(svg.classList || []);
          svg.setAttribute('class', classList.join(' '));
        }
        // Also ensure className exists and is a string even if it's empty
        if (!svg.className || typeof svg.className !== 'string') {
          svg.setAttribute('class', svg.getAttribute('class') || '');
        }
      });
    }, [icon]);
    
    return (
      <button
        ref={setRef}
        className={cn(iconButtonVariants({ variant, size, className }))}
        disabled={isDisabled}
        onClick={onClick ? handleClick : undefined}
        {...props}
      >
        {renderIcon()}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
