import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg',
        className
      )}
    >
      <AlertCircle className="w-5 h-5" />
      <p>{message}</p>
    </div>
  );
} 