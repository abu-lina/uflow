'use client';

import React from 'react';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">{children}</main>

      {/* Bottom Navigation */}
      <MobileFooterBar />
    </div>
  );
};
