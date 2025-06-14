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
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        animate={{ opacity: 1 }}
        className="w-full"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={sharedTransition}
      >
        <Suspense fallback={<LoadingPlaceholder />}>
          {isPreloading ? <LoadingPlaceholder /> : children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
