'use client';

import { useState, useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/LanguageProvider';

import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Bismillah } from '@/components/ui/Bismillah';

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
  const { t } = useLanguage();
  const translationText = t('landing.bismillah.translation');
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const typewriter = useTypewriter(translationText, 40, isFirstVisit === true && isReady);
  const [showHeading, setShowHeading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bismillahRef = useRef<SVGSVGElement>(null);
  const translationRef = useRef<HTMLSpanElement>(null);

  // Check if this is the first visit
  useEffect(() => {
    console.group('LandingHero First Visit Debug');
    const hasVisitedLanding = localStorage.getItem('hasVisitedLanding');
    const hasSeenBismillahAnimation = localStorage.getItem('hasSeenBismillahAnimation');
    const hasSeenBismillahCalligraphy = localStorage.getItem('hasSeenBismillahCalligraphy');
    const hasVisitedBismillah = localStorage.getItem('hasVisitedBismillah');

    console.log('localStorage values:', {
      hasVisitedLanding,
      hasSeenBismillahAnimation,
      hasSeenBismillahCalligraphy,
      hasVisitedBismillah,
    });

    // If any of these flags are set, we consider it not a first visit
    const hasSeenBefore =
      hasVisitedLanding === 'true' ||
      hasSeenBismillahAnimation === 'true' ||
      hasSeenBismillahCalligraphy === 'true' ||
      hasVisitedBismillah === 'true';

    console.log('Current isFirstVisit state:', isFirstVisit);
    console.log('Has seen before:', hasSeenBefore);

    if (hasSeenBefore) {
      console.log('Setting isFirstVisit to false - user has visited before');
      setIsFirstVisit(false);
      setShowHeading(true);
      setShowButton(true);
    } else {
      console.log('Setting all Bismillah-related flags in localStorage - first visit');
      localStorage.setItem('hasVisitedLanding', 'true');
      localStorage.setItem('hasSeenBismillahAnimation', 'true');
      localStorage.setItem('hasSeenBismillahCalligraphy', 'true');
      localStorage.setItem('hasVisitedBismillah', 'true');
      setIsFirstVisit(true);
    }
    console.groupEnd();
    setIsReady(true);
  }, [isFirstVisit]);

  // Show heading after typewriter is done (only on first visit)
  useEffect(() => {
    console.log(
      'Typewriter effect - isFirstVisit:',
      isFirstVisit,
      'typewriter length:',
      typewriter.length,
    );
    if (isFirstVisit === true && typewriter.length === translationText.length) {
      const timer = setTimeout(() => {
        console.log('Setting showHeading to true after typewriter');
        setShowHeading(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [typewriter, translationText, isFirstVisit]);

  // Show button after heading animation (only on first visit)
  useEffect(() => {
    if (isFirstVisit === true && showHeading) {
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

  // Don't render anything until we know if it's first visit
  if (isFirstVisit === null) {
    return null;
  }

  return (
    <section className="w-full px-6">
      <div className="flex min-h-[calc(100dvh-64px-env(safe-area-inset-bottom))] flex-col items-stretch justify-center gap-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {/* 1. Top: Calligraphy + roman text */}
        <div className="mx-auto flex w-full max-w-[500px] flex-col gap-2 px-6">
          {isFirstVisit ? (
            <>
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="w-full"
                initial={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.8, ease: smoothEase }}
              >
                <Bismillah ref={bismillahRef} className="h-auto w-full" shouldAnimate={true} />
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
                <Bismillah ref={bismillahRef} className="h-auto w-full" shouldAnimate={false} />
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
                <h1 
                  className="w-full text-center font-inter-tight text-4xl font-medium leading-tight text-content-title sm:text-5xl sm:leading-[87px] md:text-6xl lg:text-[72px]"
                  dangerouslySetInnerHTML={{ __html: t('landing.hero.title') }}
                />
                <p className="w-full max-w-xl text-center font-inter text-lg font-normal leading-snug text-content sm:text-xl sm:leading-[29px] md:text-2xl">
                  {t('landing.hero.subtitle')}
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
                <Button
                  className="h-10 px-4 text-base sm:h-12 sm:px-8 sm:text-lg"
                  variant="primary"
                  onClick={() => router.push('/providers')}
                >
                  {t('landing.hero.getStarted')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
