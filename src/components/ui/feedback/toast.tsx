'use client';

import React, { useEffect } from 'react';

import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  className?: string;
  /**
   * The aria-label for the close button
   * @default 'Close toast'
   */
  closeButtonLabel?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  className,
  closeButtonLabel = 'Close toast',
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div
      aria-live="polite"
      className={cn(
        'fixed bottom-4 right-4 z-50 min-w-[200px] rounded-lg p-4 shadow-lg',
        styles[type],
        className
      )}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{message}</p>
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
      </div>
    </div>
  );
};
