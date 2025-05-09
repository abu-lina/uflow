'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement>;

const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn('bg-card text-card-foreground rounded-lg border shadow-sm', className)}
      {...props}
    />
  );
};

const CardHeader = ({ className, ...props }: CardProps) => {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
};

const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
};

const CardDescription = ({ className, ...props }: CardProps) => {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />;
};

const CardContent = ({ className, ...props }: CardProps) => {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
};

const CardFooter = ({ className, ...props }: CardProps) => {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
