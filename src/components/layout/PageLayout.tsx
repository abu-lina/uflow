/**
 * Page Layout Components
 * 
 * Components for structuring page layouts with consistent spacing and responsive behavior.
 * Includes PageLayout, Section, and Container components for different layout needs.
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PageLayout({ children, className, fullWidth = false }: PageLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen grid grid-rows-[auto_1fr_auto]",
      "w-full mx-auto",
      fullWidth ? "max-w-none" : "max-w-[1440px] px-4 md:px-6 lg:px-8",
      className
    )}>
      {children}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'header' | 'footer' | 'main' | 'article';
  fullWidth?: boolean;
}

export function Section({ 
  children, 
  className, 
  as: Component = 'section',
  fullWidth = false 
}: SectionProps) {
  return (
    <Component className={cn(
      "w-full",
      fullWidth ? "max-w-none" : "max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8",
      className
    )}>
      {children}
    </Component>
  );
}

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function Container({ children, className, as: Component = 'div' }: ContainerProps) {
  return (
    <Component className={cn(
      "max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8",
      className
    )}>
      {children}
    </Component>
  );
} 