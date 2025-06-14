'use client';

import { useState, useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const bismillahRef = useRef<SVGSVGElement>(null);
  const translationRef = useRef<HTMLSpanElement>(null);

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

  useEffect(() => {
    function logWidths() {
      const container = containerRef.current;
      const bismillah = bismillahRef.current;
      const translation = translationRef.current;
      if (container && bismillah && translation) {
        console.group('LandingHero Width Debug');
        console.log('Container width:', container.offsetWidth, container.clientWidth);
        console.log('Bismillah SVG width:', bismillah.getBoundingClientRect().width);
        console.log('Translation span width:', translation.offsetWidth, translation.clientWidth);
        console.groupEnd();
      }
    }
    logWidths();
    window.addEventListener('resize', logWidths);
    return () => window.removeEventListener('resize', logWidths);
  }, []);

  // For translation text with a mobile-only line break after the comma
  const translationParts = translationText.split(',');

  return (
    <section className="w-full px-6">
      <div className="flex min-h-[calc(100dvh-64px-env(safe-area-inset-bottom))] flex-col items-stretch justify-center gap-10 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {/* 1. Top: Calligraphy + roman text */}
        <div className="mx-auto flex w-full max-w-[500px] flex-col gap-2 px-4">
          {isFirstVisit ? (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                className="w-full px-4"
                initial={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: smoothEase }}
              >
                <Bismillah ref={bismillahRef} className="h-auto w-full" />
              </motion.div>
              <motion.span
                ref={translationRef}
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
                    <br className="block sm:hidden" />
                    {typewriter.split(',')[1]}
                  </>
                ) : (
                  typewriter
                )}
              </motion.span>
            </>
          ) : (
            <>
              <div className="w-full">
                <Bismillah ref={bismillahRef} className="h-auto w-full px-4" />
              </div>
              <span
                ref={translationRef}
                className="block w-full bg-gold-gradient bg-clip-text text-center font-baskerville text-base font-normal leading-[18px] text-transparent"
              >
                {translationParts[0]}
                {','}
                <br className="block sm:hidden" />
                {translationParts[1]}
              </span>
            </>
          )}
        </div>
        {/* 2. Middle: Heading + Subtitle (centered) */}
        <div className="flex flex-col items-center justify-center">
          <AnimatePresence>
            {showHeading && (
              <motion.div
                animate="visible"
                className="flex flex-col items-center gap-2"
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
        </div>
        {/* 3. Bottom: Action Button */}
        <div className="flex flex-col items-center">
          <AnimatePresence>
            {showButton && (
              <motion.div
                animate="visible"
                className="flex justify-center"
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
