'use client';

import { motion } from 'motion/react';

export default function GradientInspectorPage() {
  const gradient1 = "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)";
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-8">Gradient Inspector</h1>
      
      <div className="space-y-8">
        {/* Raw gradient test */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Direct Gradient (No Wrappers)</h2>
          <div 
            className="w-64 h-12 rounded-[12px]"
            style={{
              background: gradient1,
            }}
          >
            <div className="flex items-center justify-center h-full text-white font-medium">
              Allahuma Barik
            </div>
          </div>
        </div>

        {/* With motion wrapper */}
        <div>
          <h2 className="text-xl font-semibold mb-4">With Motion Wrapper (Opacity Animation)</h2>
          <div className="w-64 h-12">
            <motion.div
              animate={{ opacity: 1 }}
              className="size-full rounded-[12px]"
              initial={{ opacity: 0 }}
              style={{
                background: gradient1,
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <div className="flex items-center justify-center h-full text-white font-medium">
                Allahuma Barik
              </div>
            </motion.div>
          </div>
        </div>

        {/* Color swatches */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Color Swatches:</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded border-2 border-gray-300"
                style={{ background: '#d2b581' }}
              />
              <div>
                <div className="font-mono text-sm">#d2b581</div>
                <div className="text-xs text-gray-600">RGB(210, 181, 129)</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded border-2 border-gray-300"
                style={{ background: '#e5d1a0' }}
              />
              <div>
                <div className="font-mono text-sm">#e5d1a0</div>
                <div className="text-xs text-gray-600">RGB(229, 209, 160)</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded border-2 border-gray-300"
                style={{ background: '#af8650' }}
              />
              <div>
                <div className="font-mono text-sm">#af8650</div>
                <div className="text-xs text-gray-600">RGB(175, 134, 80)</div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS computed values */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Expected CSS:</h3>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
{`.gradient-test {
  background: linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%);
  opacity: 1;
  isolation: isolate;
}`}
          </pre>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2">Inspection Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open DevTools (F12 or Cmd+Option+I)</li>
            <li>Select the gradient element using the inspector</li>
            <li>In the Computed tab, check:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code>background-image</code> - should show the linear-gradient</li>
                <li><code>opacity</code> - should be exactly 1</li>
                <li><code>filter</code> - should be none</li>
                <li><code>mix-blend-mode</code> - should be normal</li>
                <li><code>isolation</code> - check if set</li>
              </ul>
            </li>
            <li>Check parent elements for:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Opacity &lt; 1</li>
                <li>CSS filters</li>
                <li>Backdrop filters</li>
                <li>Transform/scale that might affect rendering</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

