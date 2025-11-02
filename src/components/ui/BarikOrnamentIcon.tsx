'use client';

import { motion } from 'motion/react';

import { ORNAMENT_PATHS } from '@/constants/svg-paths';

interface BarikOrnamentIconProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function BarikOrnamentIcon({
  className = '',
  size = 24,
  animate = true,
}: BarikOrnamentIconProps) {
  return (
    <motion.div 
      animate={animate ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
      className={`relative shrink-0 ${className}`}
      data-name="Ornament"
      initial={animate ? { opacity: 0, scale: 0.92 } : { opacity: 1, scale: 1 }}
      style={{ height: size, width: size }}
      transition={animate ? {
        delay: 0.1,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      } : undefined}
    >
      <div className="absolute inset-[16.85%_16.94%_16.48%_16.49%]" data-name="image 3 (Traced)">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
          <g id="image 3 (Traced)">
            <path 
              clipRule="evenodd" 
              d={ORNAMENT_PATHS.p3767f370} 
              fill="white" 
              fillRule="evenodd" 
            />
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
  );
}

