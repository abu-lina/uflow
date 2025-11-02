'use client';

import { useId } from 'react';
import { motion } from 'motion/react';

import { COLORS } from '@/constants/colors';
import { ORNAMENT_PATHS } from '@/constants/svg-paths';

interface BarikButtonProps {
  text?: string;
  className?: string;
}

/**
 * BarikButton - Inverted design with white background, gold gradient border, text and icon
 * Used in the bookmark button animation sequence
 */
export function BarikButton({ text = 'Allahuma Barik', className = '' }: BarikButtonProps) {
  const gradientId = useId();
  return (
    <div className={`relative rounded-[12px] size-full ${className}`} data-name="Buttons">
      {/* Gold gradient border using wrapper technique */}
      <motion.div 
        animate={{ opacity: 1 }}
        className="absolute inset-0 rounded-[12px]"
        initial={{ opacity: 0 }}
        style={{
          background: COLORS.gold.gradient,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      {/* White background with padding to create border effect */}
      <div className="absolute inset-[1.5px] rounded-[10.5px] bg-white" />
      
      {/* Content */}
      <div className="relative flex flex-row items-center justify-center size-full">
        <motion.div 
          animate={{ opacity: 1 }}
          className="box-border content-stretch flex gap-[5.143px] items-center justify-center overflow-clip px-[17.143px] py-0 relative size-full"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Ornament icon with gold gradient */}
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
                <defs>
                  <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="4.348%" stopColor={COLORS.gold.start} />
                    <stop offset="52.174%" stopColor={COLORS.gold.middle} />
                    <stop offset="100%" stopColor={COLORS.gold.end} />
                  </linearGradient>
                </defs>
                <g id="image 3 (Traced)">
                  <path clipRule="evenodd" d={ORNAMENT_PATHS.p3767f370} fill={`url(#${gradientId})`} fillRule="evenodd" />
                  <path d={ORNAMENT_PATHS.p3c97df80} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p3028d580} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p1778e980} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.peac0880} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p37d20680} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p22617200} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p1574d200} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.p959eaf0} fill={`url(#${gradientId})`} />
                  <path d={ORNAMENT_PATHS.pa6baa80} fill={`url(#${gradientId})`} />
                </g>
              </svg>
            </div>
          </motion.div>
          {/* Text with gold gradient */}
          <motion.div 
            animate={{ opacity: 1 }}
            className="flex flex-col font-['Inter_Tight:Medium',sans-serif] font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap" 
            initial={{ opacity: 0 }}
            style={{
              background: COLORS.gold.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="leading-[normal] whitespace-pre">{text}</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

