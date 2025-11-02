'use client';

import { motion } from 'motion/react';

import { Logo } from './Logo';

export function AppLoader() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8],
        }}
        className="flex items-center justify-center"
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Logo height={72} width={72} />
      </motion.div>
    </div>
  );
}
