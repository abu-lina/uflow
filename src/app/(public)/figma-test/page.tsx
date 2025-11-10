'use client';

import { useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

// This page matches the Figma structure EXACTLY
export default function FigmaTestPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    // Figma uses absolute positioning and overflow-y-auto on the container
    <div 
      ref={scrollRef} 
      className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50"
    >
      <PageHeader
        scrollContainerRef={scrollRef}
        title="Figma Test Page"
        variant="back-and-title"
        onBack="/"
      />
      
      {/* Figma uses pt-[calc(env(safe-area-inset-top)+88px)] */}
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Colorful content to see the blur effect */}
          <div className="card bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <h2 className="text-white text-2xl font-bold mb-2">Scroll Down</h2>
            <p className="text-white/90 mb-4">
              If backdrop-filter is working, this colorful content should appear 
              BLURRED and GLASSY behind the header when you scroll.
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">20px Blur</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">180% Saturate</span>
            </div>
          </div>

          {/* Generate scrollable content */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Section {i + 1}</h3>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

