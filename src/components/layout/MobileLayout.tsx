'use client';

import React from 'react';

import { MobileFooterBar } from '@/components/shared/MobileFooterBar';

import { MobileHeader } from './MobileHeader';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Navigation */}
      <MobileFooterBar />
    </div>
  );
};
