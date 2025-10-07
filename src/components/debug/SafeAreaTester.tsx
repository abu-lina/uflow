'use client';

import { useState } from 'react';

interface SafeAreaTesterProps {
  isVisible?: boolean;
}

export function SafeAreaTester({ isVisible = false }: SafeAreaTesterProps) {
  const [showTester, setShowTester] = useState(isVisible);

  if (!showTester) {
    return (
      <button
        className="fixed top-4 right-4 z-[9999] bg-red-500 text-white px-2 py-1 text-xs rounded"
        onClick={() => setShowTester(true)}
      >
        Test Safe Areas
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Safe Area Overlay */}
      <div 
        className="absolute inset-0 border-4 border-red-500"
        style={{
          borderTopWidth: 'env(safe-area-inset-top, 0px)',
          borderBottomWidth: 'env(safe-area-inset-bottom, 0px)',
          borderLeftWidth: 'env(safe-area-inset-left, 0px)',
          borderRightWidth: 'env(safe-area-inset-right, 0px)',
        }}
      />
      
      {/* Safe Area Info */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
        <div>Top: <span className="text-green-400">env(safe-area-inset-top)</span></div>
        <div>Bottom: <span className="text-green-400">env(safe-area-inset-bottom)</span></div>
        <div>Left: <span className="text-green-400">env(safe-area-inset-left)</span></div>
        <div>Right: <span className="text-green-400">env(safe-area-inset-right)</span></div>
      </div>

      {/* Close Button */}
      <button
        className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 text-xs rounded pointer-events-auto"
        onClick={() => setShowTester(false)}
      >
        Close
      </button>
    </div>
  );
}
