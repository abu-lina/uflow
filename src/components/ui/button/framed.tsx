import { ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface FramedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FramedButton = forwardRef<HTMLButtonElement, FramedButtonProps>(
  ({ className, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex flex-row items-center',
          'h-10 w-[100px] px-[14px]',
          'rounded-[12px] border border-[#CDCDCD]',
          'bg-transparent',
          'order-0 flex-none flex-grow-0',
          'focus:outline-none focus:ring-0 focus-visible:outline-none',
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span
          className={cn(
            'h-[19px] w-[72px]',
            "font-['Inter_Tight'] text-base font-medium leading-[19px]",
            'flex items-center text-center',
            'text-[#232323]',
            'order-0 flex-none flex-grow-0'
          )}
        >
          {children}
        </span>
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

FramedButton.displayName = 'FramedButton';

export { FramedButton };
