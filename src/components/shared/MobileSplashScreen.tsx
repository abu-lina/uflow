'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { Bismillah } from '@/components/ui/Bismillah';
import { hasSeenSplashScreen, markSplashScreenAsSeen } from '@/utils/splashUtils';
import { useSplash } from '@/providers/splash-provider';
import { AboutPageContent } from '@/app/(public)/about/AboutPageContent';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';

interface MobileSplashScreenProps {
  onContinue?: () => void;
}

export function MobileSplashScreen({ onContinue }: MobileSplashScreenProps) {
  const router = useRouter();
  const { isSplashVisible, setSplashVisible } = useSplash();
  const [showAboutCards, setShowAboutCards] = useState(false);

  useEffect(() => {
    // Check if user has seen splash screen before
    if (hasSeenSplashScreen()) {
      // User has seen splash before, show galleries
      setSplashVisible(false);
      return;
    }

    // Mark as seen and show splash
    markSplashScreenAsSeen();
    setSplashVisible(true);
  }, [setSplashVisible]);


  const handleContinue = () => {
    setShowAboutCards(true);
  };

  const handleAboutComplete = () => {
    setSplashVisible(false);
    if (onContinue) {
      onContinue();
    } else {
      router.push('/');
    }
  };

  // Show galleries for returning users
  if (!isSplashVisible) {
    return (
      <div className="flex flex-col w-full min-h-screen">
        <MobileGreetingHeader className="pt-[calc(1rem+env(safe-area-inset-top))] pb-4" />
        <div className="flex-1 overflow-y-auto pb-16">
          <CategoryGallerySection />
        </div>
      </div>
    );
  }

  // Show about cards if user clicked continue
  if (showAboutCards) {
    return <AboutPageContent showSplashHeader={true} onComplete={handleAboutComplete} />;
  }

  return (
    <div className="h-screen-fix flex flex-col">
      {/* HEADER SECTION - Fixed at top */}
      <MobileHeader variant="splash" />

      {/* CONTENT SECTION - Flexible middle area with proper centering */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-20 overflow-y-auto">
        {/* Content Container - All content grouped together */}
        <div className="flex flex-col items-center w-full max-w-md gap-8">
          {/* Calligraphy + Translation */}
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full gap-1"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          >
            {/* Arabic Calligraphy */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Bismillah className="h-auto w-full" shouldAnimate={true} />
            </motion.div>

            {/* German Translation */}
            <motion.div
              animate={{ opacity: 1 }}
              className="w-full text-center"
              initial={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <p 
                className="font-baskerville text-base text-center"
                style={{
                  background: 'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                Im Namen Allahs des Allerbarmers,<br />
                des Allbarmherzigen
              </p>
            </motion.div>
          </motion.div>

          {/* Title + Subtitle */}
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full gap-1"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 1.7, ease: 'easeOut' }}
          >
            {/* Main Title */}
            <h1 className="font-inter-tight text-4xl font-medium text-center text-[#232323]">
              <span className="text-[#232323]">Von </span>
              <span className="text-[#589D96]">Muslimen</span>
              <br />
              <span className="text-[#232323]">für </span>
              <span className="text-[#589D96]">Muslime.</span>
            </h1>

            {/* Description */}
            <p className="font-inter text-base leading-6 text-center text-[#555555]">
              Ummah Flow - der erste halal konforme Marktplatz der Muslime miteinander verbindet - <span className="text-[#C2A274]">insha&apos;Allah.</span>
            </p>
          </motion.div>
        </div>
      </main>

      {/* NAVBAR SECTION - Fixed at bottom */}
      <MobileNavbar
        animationDelay={2.0}
        text="Weiter"
        onClick={handleContinue}
      />
    </div>
  );
}