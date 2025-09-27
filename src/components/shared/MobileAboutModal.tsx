'use client';

import { motion, AnimatePresence } from 'framer-motion';

import { AboutCard } from '@/components/shared/AboutCard';
import { quotes } from '@/constants/quotes';

interface MobileAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileAboutModal({ isOpen, onClose }: MobileAboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center"
          exit={{ scale: 0.9, opacity: 0 }}
          initial={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <AboutCard quote={quotes[2]} />
            
            {/* Close Button */}
            <button
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-600 hover:bg-white hover:text-gray-800"
              onClick={onClose}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
