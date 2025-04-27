import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600', className)}>
      <AlertCircle className="h-5 w-5" />
      <p>{message}</p>
    </div>
  );
}
