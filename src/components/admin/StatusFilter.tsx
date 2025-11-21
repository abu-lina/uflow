'use client';

import { motion } from 'motion/react';

interface StatusFilterProps {
  selectedStatus: 'pending' | 'needs_revision';
  onStatusChange: (status: 'pending' | 'needs_revision') => void;
}

export function StatusFilter({ selectedStatus, onStatusChange }: StatusFilterProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const handleKeyDown = (e: React.KeyboardEvent, status: 'pending' | 'needs_revision') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStatusChange(status);
    }
  };

  return (
    <div 
      aria-label="Filter providers by review status"
      className="flex gap-4"
      role="tablist"
    >
      <motion.button
        animate={selectedStatus === 'pending' ? { scale: 1 } : { scale: 1 }}
        aria-controls="pending-providers"
        aria-selected={selectedStatus === 'pending'}
        className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          selectedStatus === 'pending'
            ? 'bg-primary text-white'
            : 'bg-neutral-light text-content hover:bg-neutral'
        }`}
        role="tab"
        tabIndex={selectedStatus === 'pending' ? 0 : -1}
        transition={prefersReducedMotion ? {} : { duration: 0.15 }}
        type="button"
        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        onClick={() => onStatusChange('pending')}
        onKeyDown={(e) => handleKeyDown(e, 'pending')}
      >
        Pending Review
      </motion.button>
      <motion.button
        animate={selectedStatus === 'needs_revision' ? { scale: 1 } : { scale: 1 }}
        aria-controls="needs-revision-providers"
        aria-selected={selectedStatus === 'needs_revision'}
        className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          selectedStatus === 'needs_revision'
            ? 'bg-primary text-white'
            : 'bg-neutral-light text-content hover:bg-neutral'
        }`}
        role="tab"
        tabIndex={selectedStatus === 'needs_revision' ? 0 : -1}
        transition={prefersReducedMotion ? {} : { duration: 0.15 }}
        type="button"
        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
        onClick={() => onStatusChange('needs_revision')}
        onKeyDown={(e) => handleKeyDown(e, 'needs_revision')}
      >
        Needs Revision
      </motion.button>
    </div>
  );
}

