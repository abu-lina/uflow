'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarikButton } from '@/components/ui/BarikButton';

export default function StyleCheckerPage() {
  const gradientRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gradientRef.current) return;

    const gradient = gradientRef.current;
    const computed = window.getComputedStyle(gradient);
    
    console.log('=== GRADIENT COMPUTED STYLES ===');
    console.log('background-image:', computed.backgroundImage);
    console.log('background:', computed.background);
    console.log('opacity:', computed.opacity);
    console.log('filter:', computed.filter);
    console.log('mix-blend-mode:', computed.mixBlendMode);
    console.log('isolation:', computed.isolation);
    console.log('will-change:', computed.willChange);
    
    // Check parent chain
    let parent: HTMLElement | null = gradient.parentElement;
    let level = 0;
    console.log('\n=== PARENT CHAIN OPACITY CHECK ===');
    while (parent && level < 5) {
      const parentComputed = window.getComputedStyle(parent);
      console.log(`Level ${level} (${parent.tagName}): opacity=${parentComputed.opacity}, filter=${parentComputed.filter}, transform=${parentComputed.transform}`);
      parent = parent.parentElement;
      level++;
    }
  }, []);

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-8">Style Checker - Inspect Computed Styles</h1>
      
      <div className="space-y-8">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Check Browser Console (F12)</h2>
          <p className="text-sm text-gray-600">
            Open DevTools Console to see computed styles and parent chain opacity values
          </p>
        </div>

        {/* Test with wrapper like ProviderCard */}
        <div>
          <h2 className="text-xl font-semibold mb-4">With Wrapper (Like ProviderCard)</h2>
          <div className="relative flex-1 h-12 w-64">
            <motion.div
              ref={wrapperRef}
              className="size-full cursor-pointer"
              style={{ 
                pointerEvents: 'auto',
                opacity: 1,
              }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  ref={gradientRef}
                  animate={{ opacity: 1, scale: 1 }}
                  className="size-full"
                  exit={{ opacity: 0, scale: 1.02 }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  style={{ isolation: 'isolate' }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                >
                  <BarikButton />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Direct - no wrapper */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Direct (No Wrapper)</h2>
          <div className="w-64 h-12">
            <BarikButton />
          </div>
        </div>

        {/* Manual gradient check */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Manual Gradient Check</h2>
          <div 
            className="w-64 h-12 rounded-[12px] relative"
            style={{
              background: "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)",
            }}
          >
            <div className="flex items-center justify-center h-full text-white font-medium">
              Direct Gradient
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2">How to Debug:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open Browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Look for &quot;=== GRADIENT COMPUTED STYLES ===&quot; log</li>
            <li>Check if <code>opacity</code> is exactly 1 (not 0.99 or similar)</li>
            <li>Check if <code>background-image</code> shows the correct gradient</li>
            <li>Check parent chain - if ANY parent has opacity &lt; 1, it dims the gradient</li>
            <li>Inspect the gradient element in Elements tab</li>
            <li>Check Computed tab for the gradient div</li>
            <li>Look for any CSS filters or transforms that might affect colors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

