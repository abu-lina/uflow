'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';

import { ActionButton } from '@/components/ui/ActionButton';
import { Bismillah } from '@/components/ui/Bismillah';

// Typewriter effect hook
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
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
  }, [text, speed]);
  return displayed;
}

// Custom easing curves for smooth animations
const smoothEase = [0.16, 1, 0.3, 1]; // Custom easeOutExpo

const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: smoothEase,
    },
  },
};

export function LandingHero() {
  const router = useRouter();
  const translationText = 'Im Namen Allahs des Allerbarmers, des Allbarmherzigen';
  const typewriter = useTypewriter(translationText, 40);
  const [showHeading, setShowHeading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // Check if this is the first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedLanding');
    if (hasVisited) {
      setIsFirstVisit(false);
      setShowHeading(true);
      setShowButton(true);
    } else {
      localStorage.setItem('hasVisitedLanding', 'true');
    }
  }, []);

  // Show heading after typewriter is done (only on first visit)
  useEffect(() => {
    if (isFirstVisit && typewriter.length === translationText.length) {
      const timer = setTimeout(() => {
        setShowHeading(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [typewriter, translationText, isFirstVisit]);

  // Show button after heading animation (only on first visit)
  useEffect(() => {
    if (isFirstVisit && showHeading) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showHeading, isFirstVisit]);

  return (
    <section className="flex h-screen w-full flex-col px-6 sm:px-8">
      <div className="flex w-full flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[960px] flex-col">
          {/* Bismillah Section - Upper third of screen */}
          <div className="mt-[20vh] flex w-full flex-col items-center gap-2 px-8">
            {isFirstVisit ? (
              <>
                <motion.div
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: smoothEase }}
                >
                  <Bismillah className="h-auto w-full text-mint" />
                </motion.div>
                <motion.span
                  animate={{ opacity: 1 }}
                  className="bg-gold-gradient bg-clip-text px-2 text-center font-baskerville text-base font-normal leading-[18px] text-transparent"
                  initial={{ opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.6,
                    ease: smoothEase,
                  }}
                >
                  {typewriter}
                </motion.span>
              </>
            ) : (
              <>
                <Bismillah className="h-auto w-full text-mint" />
                <span className="bg-gold-gradient bg-clip-text px-2 text-center font-baskerville text-base font-normal leading-[18px] text-transparent">
                  {translationText}
                </span>
              </>
            )}
          </div>

          {/* Heading + Paragraph Section */}
          <AnimatePresence>
            {showHeading && (
              <motion.div
                animate="visible"
                className="mt-12 flex flex-col items-center gap-2"
                initial={isFirstVisit ? 'hidden' : 'visible'}
                variants={fadeInVariants}
              >
                <h1 className="w-full text-center font-inter-tight text-4xl font-medium leading-tight text-content-title sm:text-5xl sm:leading-[87px] md:text-6xl lg:text-[72px]">
                  Von <span className="text-primary">Muslimen </span>
                  <br className="block sm:hidden" />
                  für <span className="text-primary">Muslime</span>
                </h1>
                <p className="w-full max-w-xl text-center font-inter text-lg font-normal leading-snug text-content sm:text-xl sm:leading-[29px] md:text-2xl">
                  Ein Marktplatz: Halal, transparent und mit Barakah – für dich und deine Ummah.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <AnimatePresence>
            {showButton && (
              <motion.div
                animate="visible"
                className="mt-12 flex justify-center"
                initial={isFirstVisit ? 'hidden' : 'visible'}
                variants={fadeInVariants}
              >
                <ActionButton
                  className="h-10 px-4 text-base sm:h-12 sm:px-8 sm:text-lg"
                  label="Entdecke deine Ummah"
                  size="md"
                  onAnimationComplete={() => router.push('/souks')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
