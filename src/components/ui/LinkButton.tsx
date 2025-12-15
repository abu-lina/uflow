import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The text content of the link button
   */
  children: ReactNode;
  /**
   * Additional CSS classes for the button
   */
  className?: string;
  /**
   * The variant of the link button
   * - 'primary': Primary brand color (#589D96) with hover state
   * - 'secondary': Alternative styling if needed
   */
  variant?: 'primary' | 'secondary';
}

/**
 * Reusable link button component for text-based navigation buttons.
 * 
 * This component provides consistent styling for link-style buttons used
 * throughout the application, particularly in auth flows.
 * 
 * Features:
 * - Consistent typography (text-base font-medium)
 * - Brand color scheme with hover states
 * - Proper accessibility with button semantics
 * - Customizable variants for different use cases
 * 
 * @example
 * ```tsx
 * // Primary link button (default)
 * <LinkButton onClick={() => router.push('/signup')}>
 *   Noch kein Konto? Jetzt registrieren.
 * </LinkButton>
 * 
 * // With custom className
 * <LinkButton className="text-sm" onClick={handleClick}>
 *   Custom Link Text
 * </LinkButton>
 * 
 * // Secondary variant
 * <LinkButton variant="secondary" onClick={handleAction}>
 *   Alternative Action
 * </LinkButton>
 * ```
 */
export const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ children, className = '', variant = 'primary', ...props }, ref) => {
    const variantClasses = {
      primary: 'text-primary hover:text-primary-dark',
      secondary: 'text-content-muted hover:text-content',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'h-6 text-center text-base font-medium leading-[19px] transition-colors',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

LinkButton.displayName = 'LinkButton';
