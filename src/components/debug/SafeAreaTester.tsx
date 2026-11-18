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
        className="fixed right-4 top-4 z-[9999] rounded bg-red-500 px-2 py-1 text-xs text-white"
        onClick={() => setShowTester(true)}
      >
        Test Safe Areas
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
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
      <div className="absolute left-4 top-4 rounded bg-black/80 p-2 text-xs text-white">
        <div>
          Top: <span className="text-green-400">env(safe-area-inset-top)</span>
        </div>
        <div>
          Bottom: <span className="text-green-400">env(safe-area-inset-bottom)</span>
        </div>
        <div>
          Left: <span className="text-green-400">env(safe-area-inset-left)</span>
        </div>
        <div>
          Right: <span className="text-green-400">env(safe-area-inset-right)</span>
        </div>
      </div>

      {/* Close Button */}
      <button
        className="pointer-events-auto absolute right-4 top-4 rounded bg-red-500 px-2 py-1 text-xs text-white"
        onClick={() => setShowTester(false)}
      >
        Close
      </button>
    </div>
  );
}
