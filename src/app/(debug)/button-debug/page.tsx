'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

import '@/utils/gradient-debug';

export default function ButtonDebugPage() {
  const testRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-inspect after render
    setTimeout(() => {
      if (testRef.current) {
        const gradient = testRef.current.querySelector('[data-gradient-test]') as HTMLElement;
        if (gradient) {
          const computed = window.getComputedStyle(gradient);
          
          console.log('🔍 GRADIENT DEBUG INFO');
          console.log('================================');
          console.log('Element:', gradient);
          console.log('Computed background-image:', computed.backgroundImage);
          console.log('Computed background:', computed.background);
          console.log('Computed opacity:', computed.opacity);
          console.log('Computed filter:', computed.filter);
          console.log('Computed mix-blend-mode:', computed.mixBlendMode);
          console.log('Computed isolation:', computed.isolation);
          
          // Check parent opacity chain
          console.log('\n📊 PARENT OPACITY CHAIN:');
          let parent: HTMLElement | null = gradient.parentElement;
          let level = 0;
          let totalOpacity = 1;
          
          while (parent && level < 10) {
            const parentComputed = window.getComputedStyle(parent);
            const parentOpacity = parseFloat(parentComputed.opacity);
            totalOpacity *= parentOpacity;
            
            if (parentOpacity < 1) {
              console.warn(`⚠️ Level ${level} (${parent.tagName}.${parent.className}): opacity=${parentOpacity}`);
            } else {
              console.log(`✓ Level ${level} (${parent.tagName}): opacity=${parentOpacity}`);
            }
            
            parent = parent.parentElement;
            level++;
          }
          
          console.log(`\n📉 TOTAL EFFECTIVE OPACITY: ${totalOpacity}`);
          if (totalOpacity < 0.99) {
            console.error('❌ GRADIENT IS BEING DIMMED BY PARENT OPACITY!');
          } else {
            console.log('✓ No opacity issues detected');
          }
        }
      }
    }, 1000);
  }, []);

  const gradientStyle = "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)";

  return (
    <div ref={testRef} className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-4">Button Gradient Debug Tool</h1>
      <p className="text-gray-600 mb-8">Open DevTools Console (F12) to see detailed inspection results</p>
      
      <div className="space-y-12">
        {/* Test 1: Static gradient */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 1: Static Gradient (No Animation)</h2>
          <div className="w-64 h-12 rounded-[12px] relative overflow-hidden">
            <div 
              className="absolute inset-0"
              data-gradient-test="static"
              style={{
                background: gradientStyle,
              }}
            />
            <div className="relative flex items-center justify-center h-full text-white font-medium">
              Static Gradient
            </div>
          </div>
        </div>

        {/* Test 2: With motion wrapper */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 2: With Motion Wrapper (Like ProviderCard)</h2>
          <div className="w-64 h-12">
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="size-full"
              initial={{ opacity: 1, scale: 1 }}
              style={{ isolation: 'isolate' }}
            >
              <div className="relative rounded-[12px] size-full overflow-hidden">
                <div 
                  className="absolute inset-0"
                  data-gradient-test="motion-wrapper"
                  style={{
                    background: gradientStyle,
                  }}
                />
                <div className="relative flex items-center justify-center h-full text-white font-medium">
                  With Motion Wrapper
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Test 3: With opacity animation wrapper */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 3: With Opacity Animation Wrapper</h2>
          <div className="w-64 h-12">
            <motion.div
              animate={{ opacity: 1 }}
              className="size-full"
              initial={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="relative rounded-[12px] size-full overflow-hidden">
                <div 
                  className="absolute inset-0"
                  data-gradient-test="opacity-anim"
                  style={{
                    background: gradientStyle,
                  }}
                />
                <div className="relative flex items-center justify-center h-full text-white font-medium">
                  Opacity Animation Wrapper
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Color reference */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Expected Colors Reference</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div 
                className="w-full h-16 rounded mb-2"
                style={{ background: '#d2b581' }}
              />
              <div className="font-mono text-xs">#d2b581</div>
              <div className="text-xs text-gray-600">RGB(210, 181, 129)</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-16 rounded mb-2"
                style={{ background: '#e5d1a0' }}
              />
              <div className="font-mono text-xs">#e5d1a0</div>
              <div className="text-xs text-gray-600">RGB(229, 209, 160)</div>
            </div>
            <div className="text-center">
              <div 
                className="w-full h-16 rounded mb-2"
                style={{ background: '#af8650' }}
              />
              <div className="font-mono text-xs">#af8650</div>
              <div className="text-xs text-gray-600">RGB(175, 134, 80)</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="font-semibold mb-3">🔍 Inspection Checklist:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Check console for &quot;GRADIENT DEBUG INFO&quot;</li>
            <li>Verify <code>opacity</code> is exactly 1</li>
            <li>Check parent chain - look for any opacity &lt; 1</li>
            <li>Inspect element in DevTools Elements tab</li>
            <li>Check Computed styles for the gradient div</li>
            <li>Compare visual appearance with color swatches above</li>
            <li>Take a screenshot and compare side-by-side with Figma</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

