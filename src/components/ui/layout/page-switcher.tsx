'use client';

import { HTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface PageSwitcherProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PageSwitcher = forwardRef<HTMLDivElement, PageSwitcherProps>(
  ({ className, currentPage, totalPages, onPageChange, ...props }, ref) => {
    const handlePreviousPage = () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };

    const handleNextPage = () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };

    return (
      <div ref={ref} className={cn('flex items-center justify-center gap-2', className)} {...props}>
        <button
          aria-label="Previous page"
          className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={handlePreviousPage}
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{currentPage}</span>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm text-gray-500">{totalPages}</span>
        </div>
        <button
          aria-label="Next page"
          className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === totalPages}
          onClick={handleNextPage}
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
      </div>
    );
  }
);

PageSwitcher.displayName = 'PageSwitcher';
