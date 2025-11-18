'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';

import { inspectGradient } from '@/utils/gradientDebug';

export default function GradientTestPage() {
  useEffect(() => {
    console.log('%c🎨 Gradient Debug Tools Available', 'color: #d2b581; font-size: 16px; font-weight: bold;');
    console.log('%cUse inspectGradient(element) in console to inspect any gradient element', 'color: #666;');
    console.log('Example: inspectGradient(document.querySelector("[data-gradient-test]"))');
  }, []);

  const gradient = "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)";

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold mb-2">Gradient Test & Debug</h1>
      <p className="text-gray-600 mb-8">Open DevTools Console (F12) - use <code className="bg-gray-100 px-2 py-1 rounded">inspectGradient(element)</code> to inspect any gradient</p>
      
      <div className="space-y-8">
        {/* Test buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="font-semibold mb-4">Test 1: Direct Gradient</h2>
            <div 
              className="w-full h-12 rounded-[12px] relative overflow-hidden"
              data-gradient-test="direct"
              style={{
                background: gradient,
              }}
            >
              <div className="flex items-center justify-center h-full text-white font-medium">
                Direct Gradient
              </div>
            </div>
            <button
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => {
                const el = document.querySelector('[data-gradient-test="direct"]');
                if (el && el instanceof HTMLElement) {
                  inspectGradient(el);
                }
              }}
            >
              Inspect in Console →
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="font-semibold mb-4">Test 2: With Motion Animation</h2>
            <div className="w-full h-12">
            <motion.div
              animate={{ opacity: 1 }}
              className="size-full rounded-[12px] relative overflow-hidden"
              data-gradient-test="motion"
              initial={{ opacity: 0 }}
              style={{
                background: gradient,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div className="flex items-center justify-center h-full text-white font-medium">
                  Motion Gradient
                </div>
              </motion.div>
            </div>
            <button
              className="mt-2 text-sm text-blue-600 hover:underline"
              onClick={() => {
                const el = document.querySelector('[data-gradient-test="motion"]');
                if (el && el instanceof HTMLElement) {
                  inspectGradient(el);
                }
              }}
            >
              Inspect in Console →
            </button>
          </div>
        </div>

        {/* Color reference */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <h2 className="font-semibold mb-4">Expected Gradient Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { color: '#d2b581', label: 'Start (4.348%)', rgb: 'RGB(210, 181, 129)' },
              { color: '#e5d1a0', label: 'Middle (52.174%)', rgb: 'RGB(229, 209, 160)' },
              { color: '#af8650', label: 'End (100%)', rgb: 'RGB(175, 134, 80)' },
            ].map(({ color, label, rgb }) => (
              <div key={color} className="text-center">
                <div 
                  className="w-full h-20 rounded-lg mb-2 border-2 border-gray-300"
                  style={{ background: color }}
                />
                <div className="font-mono text-sm font-semibold">{color}</div>
                <div className="text-xs text-gray-600">{rgb}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gradient definition */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="mb-2 text-gray-400">Expected CSS:</div>
          <div>background: linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%);</div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="font-semibold mb-3">🔍 How to Debug:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open DevTools Console (F12)</li>
            <li>Click &quot;Inspect in Console&quot; button above any test gradient</li>
            <li>Or manually: <code className="bg-blue-100 px-1 rounded">inspectGradient(element)</code></li>
            <li>Check the output for:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>Computed background-image value</li>
                <li>Opacity chain (any parent with opacity &lt; 1 will dim the gradient)</li>
                <li>Total effective opacity</li>
              </ul>
            </li>
            <li>Compare visual appearance with color swatches above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

