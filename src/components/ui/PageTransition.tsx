'use client';

import { Suspense } from 'react';

import { useLoading } from '@/providers/LoadingProvider';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Loading placeholder component
function LoadingPlaceholder() {
  return <div className="w-full bg-white" />;
}

/**
 * Lightweight page wrapper that handles loading state.
 * Uses CSS-only opacity transition instead of motion/react to avoid
 * pulling the entire motion runtime (~212 kB) into the shared bundle.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { isPreloading } = useLoading();

  return (
    <div
      className="flex flex-1 flex-col transition-opacity duration-300 ease-out"
      style={{ opacity: isPreloading ? 0 : 1 }}
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        {isPreloading ? <LoadingPlaceholder /> : children}
      </Suspense>
    </div>
  );
}
