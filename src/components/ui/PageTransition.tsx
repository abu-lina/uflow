'use client';

import { Suspense, useRef, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { AnimatePresence, motion } from 'motion/react';

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
  const isInitialMount = useRef(true);

  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col"
        exit={{ opacity: 0 }}
        initial={isInitialMount.current ? false : { opacity: 1 }}
        style={{
          // Ensure backdrop-filter works on fixed headers by not creating a transform context
          // Only animate opacity, avoid any transform that creates stacking context
          willChange: 'opacity',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Suspense fallback={<LoadingPlaceholder />}>
          {isPreloading ? <LoadingPlaceholder /> : children}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
