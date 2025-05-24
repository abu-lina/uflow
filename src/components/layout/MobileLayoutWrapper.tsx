'use client';

import React from 'react';

import { useIsMobile } from '@/hooks/useIsMobile';

import { Header } from './Header';
import { MobileLayout } from './MobileLayout';

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
}

export const MobileLayoutWrapper: React.FC<MobileLayoutWrapperProps> = ({ children }) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-xl px-4 py-6">{children}</div>
        </main>
      </div>
    );
  }

  return <MobileLayout>{children}</MobileLayout>;
};
