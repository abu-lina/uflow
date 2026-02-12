'use client';

import React from 'react';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="page-background flex min-h-screen w-full max-w-[100vw] flex-col">
      {/* Main Content */}
      <main className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 mobile-nav-spacing">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileFooterBar />
    </div>
  );
};
