import * as React from 'react';

import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Input } from '../input';

interface FormSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function FormSearchBar({ className, containerClassName, ...props }: FormSearchBarProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn('pl-9', className)} placeholder="Search..." {...props} />
    </div>
  );
}
