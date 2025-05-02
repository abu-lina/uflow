import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className = '', loading = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 ${className}`}
        disabled={loading}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
