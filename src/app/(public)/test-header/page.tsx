'use client';

import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';

export default function TestHeaderPage() {
  return (
    <ScrollablePageLayout>
      <PageHeader
        title="Test Header Page"
        variant="back-and-title"
        onBack="/create/basics"
      />

      
      <PageContent className="space-y-6">
          {/* Colorful hero to make blur effect visible */}
          <div className="bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 p-8 rounded-xl text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-4">✨ Scroll Down</h2>
            <p className="text-white/90 mb-4">
              This colorful content should appear BLURRED and GLASSY behind the header when you scroll.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">20px Blur</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">180% Saturate</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">Glassy Effect</span>
            </div>
          </div>

          {/* More colorful sections */}
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-6 rounded-lg text-white">
            <h3 className="font-bold mb-2">Purple & Pink Gradient</h3>
            <p className="text-white/90">
              Scroll to see this colorful content blur behind the header!
            </p>
          </div>

          {/* Generate scrollable content */}
          {Array.from({ length: 25 }).map((_, i) => (
            <div 
              key={i} 
              className={`p-6 rounded-lg shadow-md ${
                i % 3 === 0 
                  ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white' 
                  : i % 3 === 1
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                  : 'bg-white text-gray-900'
              }`}
            >
              <h3 className={`text-lg font-bold mb-2 ${i % 3 === 2 ? 'text-gray-900' : 'text-white'}`}>
                Section {i + 1}
              </h3>
              <p className={i % 3 === 2 ? 'text-gray-600' : 'text-white/90'}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          ))}
      </PageContent>
    </ScrollablePageLayout>
  );
}
