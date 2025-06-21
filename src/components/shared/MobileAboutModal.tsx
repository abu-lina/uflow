'use client';

import { motion, AnimatePresence } from 'framer-motion';

import { ActionButton } from '@/components/ui/ActionButton';

import { AboutSection } from './AboutSection';

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
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6"
            exit={{ scale: 0.9, opacity: 0 }}
            initial={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Über Ummah Flow</h2>
              <button
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={onClose}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            </div>

            <AboutSection />

            <div className="mt-6 flex justify-center">
              <ActionButton label="Verstanden" onClick={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
