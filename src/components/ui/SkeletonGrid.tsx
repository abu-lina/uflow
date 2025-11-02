'use client';

import { motion } from 'motion/react';

import { SkeletonCard } from '@/components/ui/SkeletonCard';

interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export function SkeletonGrid({ count = 8, className = '' }: SkeletonGridProps) {
  const skeletonCards = Array.from({ length: count }, (_, index) => (
    <motion.div
      key={index}
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      transition={{
        delay: index * 0.1,
        duration: 0.3,
      }}
    >
      <SkeletonCard />
    </motion.div>
  ));

  return (
    <div
      className={`grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
    >
      {skeletonCards}
    </div>
  );
}
