'use client';

import React from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { useAuth } from '@/providers/auth-provider';

export const MobileHeader: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <button className="flex items-center gap-2" onClick={() => router.push('/')}>
          <Icon className="size-8 text-mint" icon="material-symbols:mosque" />
          <span className="text-uFlowText font-inter-tight text-xl font-semibold">UFlow</span>
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <button className="flex items-center gap-2" onClick={() => router.push('/profile')}>
              <Icon className="size-6 text-gray-600" icon="material-symbols:person" />
            </button>
          ) : (
            <button className="flex items-center gap-2" onClick={() => router.push('/login')}>
              <Icon className="size-6 text-gray-600" icon="material-symbols:login" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
