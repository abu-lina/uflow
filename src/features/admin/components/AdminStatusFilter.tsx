'use client';

import { motion } from 'motion/react';

/**
 * Valid review status filter values for admin filtering (Plan 058)
 */
export type ReviewStatusFilter = 'approved' | 'pending' | 'rejected' | 'needs_revision' | null;

interface AdminStatusFilterProps {
  /** Currently selected status filter (null = all) */
  selectedStatus: ReviewStatusFilter;
  /** Callback when status filter changes */
  onStatusChange: (status: ReviewStatusFilter) => void;
}

/**
 * Admin status filter tabs for provider moderation (Plan 058 M2)
 * 
 * Shows filter tabs: All, Approved, Pending, Rejected, Needs Revision
 * Only visible to admin/moderator users on the /providers page
 */
export function AdminStatusFilter({ selectedStatus, onStatusChange }: AdminStatusFilterProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && 
    typeof window.matchMedia === 'function' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleKeyDown = (e: React.KeyboardEvent, status: ReviewStatusFilter) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStatusChange(status);
    }
  };

  const statuses: Array<{ value: ReviewStatusFilter; label: string }> = [
    { value: null, label: 'All' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'needs_revision', label: 'Needs Revision' },
  ];

  return (
    <div
      aria-label="Filter providers by review status"
      className="contents"
      role="tablist"
    >
      {statuses.map(({ value, label }) => {
        const isSelected = selectedStatus === value;
        return (
          <motion.button
            key={label}
            aria-selected={isSelected}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isSelected
                ? 'bg-primary text-white'
                : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
            }`}
            role="tab"
            tabIndex={isSelected ? 0 : -1}
            transition={prefersReducedMotion ? {} : { duration: 0.15 }}
            type="button"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            onClick={() => onStatusChange(value)}
            onKeyDown={(e) => handleKeyDown(e, value)}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
