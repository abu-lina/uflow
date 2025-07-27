'use client';

import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';
import { useAuth } from '@/hooks/useAuth';

import { AboutSection } from './AboutSection';
import { CategoryGallerySection } from './CategoryGallerySection';

// Typewriter effect hook
function useTypewriter(text: string, speed = 40, shouldAnimate = true) {
  const [displayed, setDisplayed] = useState(shouldAnimate ? '' : text);
  useEffect(() => {
    if (!shouldAnimate) return;

    let i = 0;
    let cancelled = false;
    function type() {
      if (cancelled) return;
      setDisplayed(text.slice(0, i + 1));
      if (i < text.length - 1) {
        i++;
        setTimeout(type, speed);
      }
    }
    type();
    return () => {
      cancelled = true;
    };
  }, [text, speed, shouldAnimate]);
  return displayed;
}

const smoothEase = [0.16, 1, 0.3, 1];

export function MobileGreeting() {
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [currentSection, setCurrentSection] = useState<'greeting' | 'about' | 'gallery'>(
    'greeting',
  );
  const { user } = useAuth();

  const translationText = 'Im Namen Allahs des Allerbarmers, des Allbarmherzigen';
  const typewriter = useTypewriter(translationText, 40, isFirstVisit === true && isReady);

  // Get user's first name
  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Check if this is the first visit
  useEffect(() => {
    const hasVisitedMobileGreeting = localStorage.getItem('hasVisitedMobileGreeting');

    if (hasVisitedMobileGreeting === 'true') {
      setIsFirstVisit(false);
      setCurrentSection('gallery'); // Show gallery directly for returning users
    } else {
      localStorage.setItem('hasVisitedMobileGreeting', 'true');
      setIsFirstVisit(true);
    }
    setIsReady(true);
  }, []);

  // Show about section after typewriter is done (only on first visit)
  useEffect(() => {
    if (isFirstVisit === true && typewriter.length === translationText.length) {
      const timer = setTimeout(() => {
        setCurrentSection('about');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [typewriter, translationText, isFirstVisit]);

  // Don't render anything until we know if it's first visit
  if (isFirstVisit === null) {
    return null;
  }

  const handleContinue = () => {
    setCurrentSection('gallery');
  };

  const handleSkip = () => {
    setCurrentSection('gallery');
  };

  const handleCloseAbout = () => {
    setShowAbout(false);
  };

  return (
    <div className="page-background min-h-[100dvh]">
      <AnimatePresence mode="wait">
        {currentSection === 'greeting' && isFirstVisit && (
          <motion.div
            key="greeting"
            animate={{ opacity: 1 }}
            className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto flex w-full max-w-[500px] flex-col gap-2 px-6">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="w-full"
                initial={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.8, ease: smoothEase }}
              >
                <Bismillah className="h-auto w-full" shouldAnimate={true} />
              </motion.div>
              <motion.span
                animate={{ opacity: 1 }}
                className="block w-full bg-gold-gradient bg-clip-text text-center font-baskerville text-base font-normal leading-[18px] text-transparent"
                initial={{ opacity: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.6,
                  ease: smoothEase,
                }}
              >
                {typewriter.includes(',') ? (
                  <>
                    {typewriter.split(',')[0]}
                    {','}
                    <br className="block" />
                    {typewriter.split(',')[1]}
                  </>
                ) : (
                  typewriter
                )}
              </motion.span>
            </div>
          </motion.div>
        )}

        {currentSection === 'about' && isFirstVisit && (
          <motion.div
            key="about"
            animate={{ opacity: 1 }}
            className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex w-full max-w-screen-xl flex-col items-center gap-8">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <h2 className="w-full max-w-[960px] text-center font-inter-tight text-2xl font-medium leading-tight text-black">
                  Warum braucht es einen <span className="text-mint">muslimischen Marktplatz</span>?
                </h2>
                <p className="w-full max-w-2xl text-center font-inter text-base leading-snug text-content">
                  Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder
                  stark machen.
                </p>
              </motion.div>

              <div className="flex gap-4">
                <ActionButton label="Weiter" onClick={handleContinue} />
                <ActionButton
                  className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                  label="Überspringen"
                  onClick={handleSkip}
                />
              </div>
            </div>
          </motion.div>
        )}

        {currentSection === 'gallery' && (
          <motion.div
            key="gallery"
            animate={{ opacity: 1 }}
            className="flex min-h-[100dvh] flex-col items-center justify-center gap-8"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex w-full max-w-screen-xl flex-col items-center">
              {/* New Header Design */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col items-start gap-6"
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                {/* Location Bar */}
                <div className="flex w-full flex-row items-start justify-end px-6">
                  {/* Removed white bordered rectangle */}
                </div>

                {/* Main Header */}
                <div className="flex flex-col items-start gap-2 px-6">
                  <div className="font-inter text-[14px] font-medium leading-[140%] text-[#60606F]">
                    {user ? `As-Salamu-Aleikum ${firstName},` : 'As-Salamu-Aleikum,'}
                  </div>
                  <div className="font-inter text-[24px] font-semibold leading-[140%] text-[#5B9DA0]">
                    Unterstütze Deine Ummah.
                  </div>
                </div>
              </motion.div>

              <CategoryGallerySection />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={handleCloseAbout}
          >
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-lg bg-white p-6"
              exit={{ scale: 0.9, opacity: 0 }}
              initial={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AboutSection />
              <div className="mt-6 flex justify-center">
                <ActionButton label="Verstanden" onClick={handleCloseAbout} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
