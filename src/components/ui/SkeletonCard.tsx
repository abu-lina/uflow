'use client';

import { motion } from 'motion/react';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={`relative overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm ${className}`}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image skeleton with shimmer */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-200">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 p-4">
        {/* Title skeleton with shimmer */}
        <div className="relative h-5 overflow-hidden rounded bg-gray-200">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>

        {/* Category skeleton with shimmer */}
        <div className="relative h-4 w-1/3 overflow-hidden rounded bg-gray-200">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>

        {/* Description skeleton with shimmer */}
        <div className="space-y-2">
          <div className="relative h-3 overflow-hidden rounded bg-gray-200">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          <div className="relative h-3 w-4/5 overflow-hidden rounded bg-gray-200">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>

        {/* Action buttons skeleton with shimmer */}
        <div className="flex items-center justify-between pt-2">
          <div className="relative h-8 w-20 overflow-hidden rounded bg-gray-200">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-200">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
