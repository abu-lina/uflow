'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ORNAMENT_PATHS } from '@/constants/svg-paths';

// Use our paths (Figma_imports excluded from build)
const svgPathsBarik = ORNAMENT_PATHS;

type ButtonState = "speichern" | "barik" | "gespeichert";

// Our implementation
function OurBarikButton() {
  return (
    <div className="relative rounded-[12px] size-full overflow-hidden" data-name="Buttons">
      <motion.div 
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        style={{
          background: "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)",
          isolation: "isolate",
          willChange: "opacity",
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <div className="relative flex flex-row items-center justify-center size-full">
        <motion.div 
          animate={{ opacity: 1 }}
          className="box-border content-stretch flex gap-[5.143px] items-center justify-center overflow-clip px-[17.143px] py-0 relative size-full"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div 
            animate={{ opacity: 1, scale: 1 }}
            className="relative shrink-0 size-[24px]" 
            data-name="Ornament"
            initial={{ opacity: 0, scale: 0.92 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="absolute inset-[16.85%_16.94%_16.48%_16.49%]" data-name="image 3 (Traced)">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                <g id="image 3 (Traced)">
                  <path clipRule="evenodd" d={ORNAMENT_PATHS.p3767f370} fill="white" fillRule="evenodd" />
                  <path d={ORNAMENT_PATHS.p3c97df80} fill="white" />
                  <path d={ORNAMENT_PATHS.p3028d580} fill="white" />
                  <path d={ORNAMENT_PATHS.p1778e980} fill="white" />
                  <path d={ORNAMENT_PATHS.peac0880} fill="white" />
                  <path d={ORNAMENT_PATHS.p37d20680} fill="white" />
                  <path d={ORNAMENT_PATHS.p22617200} fill="white" />
                  <path d={ORNAMENT_PATHS.p1574d200} fill="white" />
                  <path d={ORNAMENT_PATHS.p959eaf0} fill="white" />
                  <path d={ORNAMENT_PATHS.pa6baa80} fill="white" />
                </g>
              </svg>
            </div>
          </motion.div>
          <motion.div 
            animate={{ opacity: 1 }}
            className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white" 
            initial={{ opacity: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="leading-[normal] whitespace-pre">Allahuma Barik</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Figma's exact implementation
function FigmaBarikButton() {
  return (
    <div className="relative rounded-[12px] size-full overflow-hidden" data-name="Buttons">
      <motion.div 
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        style={{
          background: "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)",
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      <div className="relative flex flex-row items-center justify-center size-full">
        <motion.div 
          animate={{ opacity: 1 }}
          className="box-border content-stretch flex gap-[5.143px] items-center justify-center overflow-clip px-[17.143px] py-0 relative size-full"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div 
            animate={{ opacity: 1, scale: 1 }}
            className="relative shrink-0 size-[24px]" 
            data-name="Ornament"
            initial={{ opacity: 0, scale: 0.92 }}
            transition={{
              duration: 0.5,
              delay: 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="absolute inset-[16.85%_16.94%_16.48%_16.49%]" data-name="image 3 (Traced)">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                <g id="image 3 (Traced)">
                  <path clipRule="evenodd" d={svgPathsBarik.p3767f370} fill="white" fillRule="evenodd" />
                  <path d={svgPathsBarik.p3c97df80} fill="white" />
                  <path d={svgPathsBarik.p3028d580} fill="white" />
                  <path d={svgPathsBarik.p1778e980} fill="white" />
                  <path d={svgPathsBarik.peac0880} fill="white" />
                  <path d={svgPathsBarik.p37d20680} fill="white" />
                  <path d={svgPathsBarik.p22617200} fill="white" />
                  <path d={svgPathsBarik.p1574d200} fill="white" />
                  <path d={svgPathsBarik.p959eaf0} fill="white" />
                  <path d={svgPathsBarik.pa6baa80} fill="white" />
                </g>
              </svg>
            </div>
          </motion.div>
          <motion.div 
            animate={{ opacity: 1 }}
            className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white" 
            initial={{ opacity: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="leading-[normal] whitespace-pre">Allahuma Barik</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// Static version without animations
function StaticBarikButton() {
  return (
    <div className="relative rounded-[12px] size-full overflow-hidden" data-name="Buttons">
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #d2b581 4.348%, #e5d1a0 52.174%, #af8650 100%)",
        }}
      />
      <div className="relative flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[5.143px] items-center justify-center overflow-clip px-[17.143px] py-0 relative size-full">
          <div className="relative shrink-0 size-[24px]">
            <div className="absolute inset-[16.85%_16.94%_16.48%_16.49%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                <g>
                  <path clipRule="evenodd" d={ORNAMENT_PATHS.p3767f370} fill="white" fillRule="evenodd" />
                  <path d={ORNAMENT_PATHS.p3c97df80} fill="white" />
                  <path d={ORNAMENT_PATHS.p3028d580} fill="white" />
                  <path d={ORNAMENT_PATHS.p1778e980} fill="white" />
                  <path d={ORNAMENT_PATHS.peac0880} fill="white" />
                  <path d={ORNAMENT_PATHS.p37d20680} fill="white" />
                  <path d={ORNAMENT_PATHS.p22617200} fill="white" />
                  <path d={ORNAMENT_PATHS.p1574d200} fill="white" />
                  <path d={ORNAMENT_PATHS.p959eaf0} fill="white" />
                  <path d={ORNAMENT_PATHS.pa6baa80} fill="white" />
                </g>
              </svg>
            </div>
          </div>
          <div className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white">
            <p className="leading-[normal] whitespace-pre">Allahuma Barik</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ButtonComparisonPage() {
  const [buttonState, setButtonState] = useState<ButtonState>("barik");

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-8">Button Gradient Debug Comparison</h1>
      
      <div className="space-y-12">
        {/* Static comparison */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Static Version (No Animations)</h2>
          <div className="w-64 h-12">
            <StaticBarikButton />
          </div>
        </div>

        {/* Our implementation */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Our Implementation (With Animations)</h2>
          <div className="w-64 h-12">
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="size-full"
            >
              <OurBarikButton />
            </motion.div>
          </div>
        </div>

        {/* Figma implementation */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Figma Implementation (Exact Copy)</h2>
          <div className="w-64 h-12">
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="size-full"
            >
              <FigmaBarikButton />
            </motion.div>
          </div>
        </div>

        {/* Side by side */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Side by Side Comparison</h2>
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-2">Our Version</p>
              <div className="w-64 h-12">
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="size-full"
                >
                  <OurBarikButton />
                </motion.div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Figma Version</p>
              <div className="w-64 h-12">
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  initial={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="size-full"
                >
                  <FigmaBarikButton />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient color values */}
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Expected Gradient Colors:</h3>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded" style={{ background: '#d2b581' }} />
              <span>#d2b581 (4.348%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded" style={{ background: '#e5d1a0' }} />
              <span>#e5d1a0 (52.174%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded" style={{ background: '#af8650' }} />
              <span>#af8650 (100%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm">
          <strong>Debug Instructions:</strong>
          <br />
          1. Open browser DevTools (F12)
          <br />
          2. Inspect the gradient div (the one with "absolute inset-0")
          <br />
          3. Check computed styles - look for:
          <br />
          &nbsp;&nbsp;- background-image (should show the linear-gradient)
          <br />
          &nbsp;&nbsp;- opacity (should be 1)
          <br />
          &nbsp;&nbsp;- filter (should be none)
          <br />
          &nbsp;&nbsp;- mix-blend-mode (should be normal)
          <br />
          4. Check if any parent elements have opacity, filters, or transforms
        </p>
      </div>
    </div>
  );
}

