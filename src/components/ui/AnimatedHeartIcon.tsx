'use client';

import { motion } from 'motion/react';

import { HEART_PATH_FIGMA } from '@/constants/svg-paths';

interface AnimatedHeartIconProps {
  filled?: boolean;
  animate?: boolean; // Animate the scale/pulse effect
  animateFill?: boolean; // Animate the fill animation (stroke then fill) - only on user interaction
  className?: string;
  size?: number;
  useFigmaPath?: boolean;
}

// Iconamoon heart SVG path (viewBox 0 0 24 24) - fallback for non-Figma mode
const HEART_PATH = 'M19.071 13.142L13.414 18.8a2 2 0 0 1-2.828 0l-5.657-5.657A5 5 0 1 1 12 6.072a5 5 0 0 1 7.071 7.07';

export function AnimatedHeartIcon({ 
  filled = false, 
  animate = false,
  animateFill = false, // Only animate fill on user interaction, not initial mount
  className = '',
  size = 24,
  useFigmaPath = false,
}: AnimatedHeartIconProps) {
  const heartPath = useFigmaPath ? HEART_PATH_FIGMA : HEART_PATH;
  const viewBox = useFigmaPath ? "0 0 16 16" : "0 0 24 24";
  const strokeWidth = useFigmaPath ? "1.33333" : "2";

  // For saved hearts on initial mount, render static (no animation wrapper)
  const shouldRenderStatic = filled && !animate && !animateFill;
  
  const iconContent = (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox={viewBox}>
      <g id="iconamoon:heart">
        {filled ? (
          animateFill ? (
            <>
              {/* Stage 1: Draw stroke outline */}
              <motion.path
                animate={{ 
                  opacity: [0, 1],
                  pathLength: 1,
                }}
                d={heartPath}
                fill="none"
                initial={{ opacity: 0, pathLength: 0 }}
                stroke="var(--stroke-0, white)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
                transition={{
                  opacity: {
                    duration: 0.3,
                    ease: "easeOut",
                  },
                  pathLength: {
                    duration: 0.5,
                    ease: "easeInOut",
                  },
                }}
              />
              {/* Stage 2: Fill appears after stroke (with stroke to maintain outline) */}
              <motion.path
                animate={{ opacity: 1 }}
                d={heartPath}
                fill="white"
                initial={{ opacity: 0 }}
                stroke="var(--stroke-0, white)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeWidth}
                transition={{
                  delay: 0.5,
                  duration: 0.3,
                  ease: "easeOut",
                }}
              />
            </>
          ) : (
            // Static filled heart - no animation on mount
            <path
              d={heartPath}
              fill="white"
              stroke="var(--stroke-0, white)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
            />
          )
        ) : (
          <motion.path
            animate={{ opacity: 1, pathLength: 1 }}
            d={heartPath}
            fill="none"
            initial={false}
            stroke="var(--stroke-0, white)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
          />
        )}
      </g>
    </svg>
  );

  if (shouldRenderStatic) {
    return (
      <div 
        className={`relative shrink-0 ${className}`}
        data-name="iconamoon:heart"
        style={{ height: size, width: size }}
      >
        {iconContent}
      </div>
    );
  }

  return (
    <motion.div 
      animate={animate ? {
        opacity: 1,
        scale: [0.9, 1.1, 1.05, 1],
      } : {
        opacity: 1,
        scale: 1,
      }}
      className={`relative shrink-0 ${className}`}
      data-name="iconamoon:heart"
      initial={false}
      style={{ height: size, width: size }}
      transition={{
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {iconContent}
    </motion.div>
  );
}
