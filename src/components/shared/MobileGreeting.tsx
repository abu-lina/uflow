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

// Skeleton component for gallery loading
function GallerySkeleton() {
  return (
    <section className="w-full px-6 pb-8 pt-4 lg:hidden">
      <div className="flex flex-col gap-6">
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            animate={{ opacity: [0.6, 1, 0.6] }}
            className="flex flex-col rounded-lg p-2"
            transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
          >
            {/* Header skeleton */}
            <div className="mb-3 flex w-full flex-row items-start justify-between">
              <div className="flex flex-col items-start gap-2.5 p-3">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-24 animate-pulse rounded bg-gray-300" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center">
                <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
              </div>
            </div>

            {/* Gallery image skeleton */}
            <div className="flex aspect-[16/7] min-h-[162px] w-full overflow-hidden rounded-[29px]">
              <div className="flex h-full w-full">
                {[...Array(4)].map((_, imgIndex) => (
                  <div
                    key={imgIndex}
                    className={`relative h-full w-1/4 overflow-hidden ${
                      imgIndex === 0 ? 'rounded-l-[29px]' : ''
                    } ${imgIndex === 3 ? 'rounded-r-[29px]' : ''}`}
                  >
                    <div className="absolute inset-0 animate-pulse bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function MobileGreeting() {
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [currentSection, setCurrentSection] = useState<'greeting' | 'about' | 'gallery'>(
    'greeting',
  );
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
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

  // Simulate gallery loading for better UX
  useEffect(() => {
    if (currentSection === 'gallery') {
      const timer = setTimeout(() => {
        setIsGalleryLoading(false);
      }, 1200); // Show skeleton for 1.2s for smoother transition
      return () => clearTimeout(timer);
    }
  }, [currentSection]);

  // Don't render anything until we know if it's first visit
  if (isFirstVisit === null) {
    return (
      <div className="page-background flex min-h-[100dvh] items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          className="text-center"
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </motion.div>
      </div>
    );
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
              {/* Fixed Header - Never moves */}
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="fixed left-0 right-0 top-0 z-40"
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <div className="mx-auto flex w-full max-w-screen-xl flex-col items-start gap-6">
                  {/* Location Bar */}
                  <div className="flex w-full flex-row items-start justify-end px-6">
                    {/* Removed white bordered rectangle */}
                  </div>

                  {/* Main Header with staggered animation */}
                  <div className="flex flex-col items-start gap-2 px-6 pb-4">
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="font-inter text-[14px] font-medium leading-[140%] text-[#60606F]"
                      initial={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      {user ? `As-Salamu-Aleikum ${firstName},` : 'As-Salamu-Aleikum,'}
                    </motion.div>
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className="font-inter text-[24px] font-semibold leading-[140%] text-[#5B9DA0]"
                      initial={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Unterstütze Deine Ummah.
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Gallery with loading state - Below fixed header */}
              <div className="w-full pt-20">
                <AnimatePresence mode="wait">
                  {isGalleryLoading ? (
                    <motion.div
                      key="skeleton"
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                      <GallerySkeleton />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      initial={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                      <CategoryGallerySection />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
