'use client';

import { type ReactNode } from 'react';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return <div className="relative min-h-screen">{children}</div>;
}
