'use client';

import { type ReactNode } from 'react';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="page-background relative flex min-h-screen flex-col px-4 py-6 md:px-0">
      {children}
    </div>
  );
}
