'use client';

import { motion } from 'motion/react';
import { Icon } from '@iconify/react';

import { Logo } from '@/components/ui/Logo';

interface MobileHeaderProps {
  variant: 'splash' | 'about' | 'default';
  title?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function MobileHeader({ 
  variant, 
  title, 
  onBack, 
  showBackButton = true,
  className = '' 
}: MobileHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
        <header className={`fixed top-0 left-0 right-0 z-50 w-full bg-white/34 backdrop-blur-sm border-b border-gray-200/30 pt-safe-top ${className}`}>
      <div className="flex items-center justify-center w-full h-16 px-6 sm:px-8">
        <div className="flex w-full max-w-[400px] items-center justify-center">
          {variant === 'splash' ? (
            /* Splash Header - Centered Logo */
            <div className="flex flex-row justify-center items-center w-full">
            <motion.div 
              animate={{ opacity: 1, y: 0 }}
              className="w-10 h-10"
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Logo className="w-10 h-10" height={40} width={40} />
            </motion.div>
          </div>
        ) : variant === 'about' ? (
          /* About Header - Back Button + Title + Logo */
          <div className="flex flex-row justify-between items-center w-full gap-2">
            {/* Left Side - Back Button + Title */}
            <div className="flex flex-row items-center gap-2">
              {showBackButton && (
                <button
                  aria-label="Zurück"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  onClick={handleBack}
                >
                  <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-left" />
                </button>
              )}
              {title && (
                <h1 className="text-xl font-semibold text-content-title">
                  {title}
                </h1>
              )}
            </div>
            
            {/* Right Side - Logo */}
            <div className="relative w-10 h-10 flex-shrink-0">
              <Logo className="w-10 h-10" height={40} width={40} />
            </div>
          </div>
        ) : (
          /* Default Header - Logo + Optional Actions */
          <div className="flex flex-row justify-between items-center w-full">
            {/* Left Side - Logo */}
            <div className="flex flex-row items-center gap-2">
              <div className="w-10 h-10">
                <Logo className="w-10 h-10" height={40} width={40} />
              </div>
              {title && (
                <h1 className="text-xl font-semibold text-content-title">
                  {title}
                </h1>
              )}
            </div>
            
            {/* Right Side - Optional Actions */}
            <div className="flex flex-row items-center gap-2">
              {/* Add action buttons here if needed */}
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
