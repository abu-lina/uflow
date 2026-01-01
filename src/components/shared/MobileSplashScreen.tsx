'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useWaitlistFlow } from '@/hooks/useWaitlistFlow';
import { AboutPageContent } from '@/components/shared/AboutPageContent';
import { SplashLayout } from '@/components/layout/SplashLayout';
import { SplashContent } from '@/components/shared/SplashContent';
import { WaitlistScreen } from '@/components/shared/WaitlistScreen';
import { ProviderSelectionModal } from '@/components/shared/ProviderSelectionModal';
import { WaitlistSuccessScreen } from '@/components/shared/WaitlistSuccessScreen';
import { EarlyAccessScreen } from '@/components/shared/EarlyAccessScreen';

interface MobileSplashScreenProps {
  onContinue?: () => void;
}

export function MobileSplashScreen({ onContinue: _onContinue }: MobileSplashScreenProps) {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Use state machine hook for flow management
  const {
    currentState,
    flowData,
    isInitialized,
    handleContinue,
    handleAboutComplete,
    handleWaitlistSuccess,
    handleSuccessComplete,
    handleAboutCompleteFromEarlyAccess,
    handleProviderQuestion,
    handleWaitlistComplete,
  } = useWaitlistFlow();

  // Mark component as mounted after hydration to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // REMOVED: City redirect logic - let RootPageContent handle routing
  // This ensures the root page shows appropriate stage content without redirects
  // which is critical for PWA installability
  // useEffect(() => {
  //   if (!isMounted || !isInitialized) return;
  //
  //   // Only redirect if user is in early access state (has completed onboarding)
  //   if (currentState === 'earlyAccess') {
  //     const selectedCity = 
  //       typeof window !== 'undefined' 
  //         ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
  //         : null;
  //
  //     if (selectedCity) {
  //       // Redirect to city page - it will handle provider count check and show appropriate screen
  //       router.replace(`/city/${encodeURIComponent(selectedCity)}`);
  //     }
  //   }
  // }, [isMounted, isInitialized, currentState, router]);

  // Handle provider question - show modal
  const handleProviderQuestionWithModal = (email: string) => {
    handleProviderQuestion(email);
    setShowProviderModal(true);
  };

  const handleProviderModalClose = () => {
    setShowProviderModal(false);
  };

  // Handle waitlist complete from provider modal
  const handleWaitlistCompleteFromModal = (token?: string) => {
    setShowProviderModal(false);
    handleWaitlistComplete(token);
  };


  // During SSR and initial hydration, show consistent content to prevent hydration mismatch
  if (!isMounted || !isInitialized) {
    // Show splash layout during initial render to match server
    // This prevents hydration mismatch
    return (
      <SplashLayout onContinue={handleContinue}>
        <SplashContent />
      </SplashLayout>
    );
  }

  // Render based on current state using state machine
  // Use AnimatePresence for smooth transitions between states
  return (
    <AnimatePresence mode="wait">
      {currentState === 'loading' && (
        <motion.div
          key="loading"
          animate={{ opacity: 1 }}
          className="flex h-screen w-full items-center justify-center"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <SplashLayout onContinue={handleContinue}>
            <SplashContent />
          </SplashLayout>
        </motion.div>
      )}

      {currentState === 'splash' && (
        <motion.div
          key="splash"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <SplashLayout onContinue={handleContinue}>
            <SplashContent />
          </SplashLayout>
        </motion.div>
      )}

      {currentState === 'about' && (
        <motion.div
          key="about"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <AboutPageContent showSplashHeader={true} onComplete={handleAboutComplete} />
        </motion.div>
      )}

      {currentState === 'waitlist' && (
        <motion.div
          key="waitlist"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <WaitlistScreen 
            onProviderQuestion={handleProviderQuestionWithModal}
            onSuccess={handleWaitlistSuccess}
          />
          <ProviderSelectionModal
            email={flowData.email}
            isOpen={showProviderModal}
            onClose={handleProviderModalClose}
            onComplete={handleWaitlistCompleteFromModal}
          />
        </motion.div>
      )}

      {currentState === 'success' && (
        <motion.div
          key="success"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <WaitlistSuccessScreen 
            autoDismiss={false}
            onContinue={handleSuccessComplete}
          />
        </motion.div>
      )}

      {currentState === 'earlyAccess' && (
        <motion.div
          key="earlyAccess"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <EarlyAccessScreen
            email={flowData.email}
            waitlistToken={flowData.waitlistToken || ''}
          />
        </motion.div>
      )}

      {currentState === 'aboutFromEarlyAccess' && (
        <motion.div
          key="aboutFromEarlyAccess"
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <AboutPageContent showSplashHeader={true} onComplete={handleAboutCompleteFromEarlyAccess} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}