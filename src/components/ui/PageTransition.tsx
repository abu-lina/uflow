'use client';

import { Suspense } from 'react';

import { usePathname } from 'next/navigation';

import { AnimatePresence, motion } from 'framer-motion';

import { useLoading } from '@/providers/LoadingProvider';

// Shared transition configuration for consistent animations
export const sharedTransition = {
  duration: 0.2,
  ease: 'easeInOut',
} as const;

interface PageTransitionProps {
  children: React.ReactNode;
}

// Loading placeholder component
function LoadingPlaceholder() {
  return <div className="w-full bg-white" />;
}

export function PageTransition({ children }: PageTransitionProps) {
  const { isPreloading } = useLoading();
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        animate={{ opacity: 1 }}
        className="w-full"
        exit={{ opacity: 0 }}
        initial={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <Suspense fallback={<LoadingPlaceholder />}>
          {isPreloading ? <LoadingPlaceholder /> : children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
