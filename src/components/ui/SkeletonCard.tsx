'use client';

import { motion } from 'motion/react';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <motion.div
      animate={{ opacity: [0.6, 1, 0.6] }}
      className={`overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm ${className}`}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {/* Image skeleton */}
      <div className="aspect-[4/3] animate-pulse bg-gray-200" />

      {/* Content skeleton */}
      <div className="space-y-3 p-4">
        {/* Title skeleton */}
        <div className="h-5 animate-pulse rounded bg-gray-200" />

        {/* Category skeleton */}
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
    </motion.div>
  );
}
