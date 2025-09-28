'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

import { Logo } from '@/components/ui/Logo';
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

  // Disable body scrolling when splash is visible
  useEffect(() => {
    if (isSplashVisible) {
      // Disable scrolling on body and html
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
    } else {
      // Re-enable scrolling
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
    };
  }, [isSplashVisible]);

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
      <div className="flex flex-col w-full">
        <MobileGreetingHeader className="pt-[calc(1rem+env(safe-area-inset-top))] pb-4" />
        <CategoryGallerySection />
      </div>
    );
  }

  // Show about cards if user clicked continue
  if (showAboutCards) {
    return <AboutPageContent showSplashHeader={true} onComplete={handleAboutComplete} />;
  }

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center px-4 overflow-hidden safari-mobile-fix"
      style={{ 
        background: 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center w-full pt-8 pb-8">
        {/* Logo */}
        <div className="flex flex-row justify-center items-center w-full h-[48px]">
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="w-12 h-12"
            initial={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Logo className="w-12 h-12" height={48} width={48} />
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center w-full flex-1 pb-20">
        <motion.div 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center w-full px-6 gap-8"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        >
          {/* Calligraphy + Translation Group */}
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full gap-2"
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

          {/* Heading + Text Group */}
          <motion.div 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center w-full gap-2"
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
        </motion.div>
      </div>

      {/* Weiter Button - Sticky Bottom */}
      <motion.div 
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-row justify-center items-center w-full bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 2.0 }}
      >
        <button 
          className="flex flex-row justify-center items-center w-[345px] h-12 bg-[#589D96] rounded-xl px-5 py-4 gap-2"
          onClick={handleContinue}
        >
          <span className="font-inter-tight text-base font-medium text-white text-center">
            Weiter
          </span>
          <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />
        </button>
      </motion.div>
    </div>
  );
}