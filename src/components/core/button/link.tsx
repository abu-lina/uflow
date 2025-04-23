import { ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface ButtonLinkProps extends ButtonProps {
  href: string;
}

export const ButtonLink = forwardRef<HTMLButtonElement, ButtonLinkProps>(
  ({ className, href, children, ...props }, ref) => {
    return (
      <Link 
        href={href} 
        className={cn(
          "flex flex-row items-center",
          "w-[94px] h-10 px-[14px]",
          "rounded-[12px]",
          "flex-none order-1 flex-grow-0",
          "focus:outline-none focus:ring-0 focus-visible:outline-none",
          "bg-transparent",
          className
        )}
      >
        <span 
          className={cn(
            "w-[66px] h-[19px]",
            "font-['Inter_Tight'] text-base leading-[19px] font-medium",
            "flex items-center text-center",
            "text-[#232323]",
            "flex-none order-0 flex-grow-0"
          )}
        >
          {children}
        </span>
      </Link>
    );
  }
);

ButtonLink.displayName = 'ButtonLink'; 