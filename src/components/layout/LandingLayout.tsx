'use client';

import { type ReactNode } from 'react';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return <div className="page-background relative min-h-screen">{children}</div>;
}
