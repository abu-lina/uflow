import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  as?: 'div' | 'section' | 'article';
}

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
};

export function Grid({ 
  children, 
  className, 
  cols = 1, 
  gap = 'md',
  as: Component = 'div'
}: GridProps) {
  return (
    <Component className={cn(
      "grid",
      "grid-cols-1",
      cols >= 2 && "sm:grid-cols-2",
      cols >= 3 && "md:grid-cols-3",
      cols >= 4 && "lg:grid-cols-4",
      gapClasses[gap],
      className
    )}>
      {children}
    </Component>
  );
}

interface GridItemProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  as?: 'div' | 'section' | 'article';
}

export function GridItem({ 
  children, 
  className, 
  span = 1,
  as: Component = 'div'
}: GridItemProps) {
  return (
    <Component className={cn(
      "col-span-1",
      span >= 2 && "sm:col-span-2",
      span >= 3 && "md:col-span-3",
      span >= 4 && "lg:col-span-4",
      className
    )}>
      {children}
    </Component>
  );
} 