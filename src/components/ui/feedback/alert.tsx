'use client';

import React from 'react';

import { cn } from '@/lib/utils';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
  /**
   * The aria-label for the close button
   * @default 'Close alert'
   */
  closeButtonLabel?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  onClose,
  className,
  closeButtonLabel = 'Close alert',
}) => {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div
      aria-live="polite"
      className={cn('rounded-lg border p-4', styles[type], className)}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button
            aria-label={closeButtonLabel}
            className="ml-4 text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2"
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
