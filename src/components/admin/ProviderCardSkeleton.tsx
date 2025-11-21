'use client';

import { motion } from 'motion/react';

export function ProviderCardSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      className="bg-white rounded-lg border border-neutral-light p-4 md:p-6 shadow-sm"
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Image skeleton */}
        <div className="flex-shrink-0 relative w-full h-48 md:w-32 md:h-32 bg-neutral-muted rounded-lg" />
        
        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Title */}
          <div className="h-6 bg-neutral-muted rounded w-3/4" />
          
          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-neutral-muted rounded w-full" />
            <div className="h-4 bg-neutral-muted rounded w-5/6" />
          </div>
          
          {/* Metadata */}
          <div className="space-y-2">
            <div className="h-4 bg-neutral-muted rounded w-1/2" />
            <div className="h-4 bg-neutral-muted rounded w-1/3" />
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <div className="h-10 bg-neutral-muted rounded w-24" />
            <div className="h-10 bg-neutral-muted rounded w-24" />
            <div className="h-10 bg-neutral-muted rounded w-32" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

