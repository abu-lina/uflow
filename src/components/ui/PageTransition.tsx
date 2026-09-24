'use client';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Lightweight structural page wrapper.
 *
 * `relative` establishes a containing block so that child components using
 * `absolute inset-0` (e.g. ScrollablePageLayout) resolve against this element
 * rather than a distant ancestor. This prevents layout collapse on devices
 * where the root viewport height may not propagate correctly (Plan 015).
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <div className="relative flex flex-1 flex-col">{children}</div>;
}
