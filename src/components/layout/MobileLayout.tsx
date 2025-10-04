'use client';

import React from 'react';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div
      className="page-background flex min-h-[100dvh] w-full max-w-[100vw] flex-col"
      style={{ minHeight: '100dvh' }}
    >
      {/* Main Content */}
      <main className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-mobile-nav-md">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileFooterBar />
    </div>
  );
};
