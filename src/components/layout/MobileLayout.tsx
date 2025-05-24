'use client';

import React from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { MobileHeader } from './MobileHeader';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const router = useRouter();

  const navItems = [
    { icon: 'material-symbols:home', label: 'Home', path: '/' },
    { icon: 'material-symbols:search', label: 'Search', path: '/search' },
    { icon: 'material-symbols:bookmark', label: 'Saved', path: '/saved' },
    { icon: 'material-symbols:person', label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2"
              onClick={() => router.push(item.path)}
            >
              <Icon className="size-6 text-gray-600" icon={item.icon} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
