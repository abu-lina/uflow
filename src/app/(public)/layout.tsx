'use client';

import { type ReactNode } from 'react';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Background Layer */}
      <div
        className="fixed inset-0 bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] before:pointer-events-none before:fixed before:inset-0 before:z-0 before:bg-[url('/images/pattern.svg')] before:bg-repeat before:opacity-5"
        style={
          {
            '--pattern-fallback':
              'linear-gradient(45deg, #589D96 1px, transparent 1px), linear-gradient(-45deg, #589D96 1px, transparent 1px)',
            '--pattern-size': '20px',
          } as React.CSSProperties
        }
      >
        {/* Fallback pattern using CSS */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-5"
          style={{
            backgroundImage: 'var(--pattern-fallback)',
            backgroundSize: 'var(--pattern-size) var(--pattern-size)',
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
