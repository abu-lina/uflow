'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSplash } from '@/providers/splash-provider';
import { AboutPageContent } from '@/components/shared/AboutPageContent';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';
import { SplashLayout } from '@/components/layout/SplashLayout';
import { SplashContent } from '@/components/shared/SplashContent';
import { WaitlistScreen } from '@/components/shared/WaitlistScreen';
import { ProviderSelectionModal } from '@/components/shared/ProviderSelectionModal';
import { WaitlistSuccessScreen } from '@/components/shared/WaitlistSuccessScreen';

interface MobileSplashScreenProps {
  onContinue?: () => void;
}

export function MobileSplashScreen({ onContinue }: MobileSplashScreenProps) {
  const router = useRouter();
  const { isSplashVisible, dismissSplash } = useSplash();
  const [showAboutCards, setShowAboutCards] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleContinue = () => {
    setShowAboutCards(true);
  };

  const handleAboutComplete = () => {
    // After about cards, show waitlist
    setShowAboutCards(false);
    setShowWaitlist(true);
  };

  const handleProviderQuestion = (email: string) => {
    // Save email and show provider modal
    setWaitlistEmail(email);
    setShowProviderModal(true);
  };

  const handleProviderModalClose = () => {
    setShowProviderModal(false);
  };

  const handleWaitlistComplete = () => {
    // Show success screen
    setShowWaitlist(false);
    setShowProviderModal(false);
    setShowSuccess(true);
  };

  const handleSuccessComplete = () => {
    // Dismiss splash and continue to app
    dismissSplash();
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
        <MobileGreetingHeader className="pt-[env(safe-area-inset-top)] pb-4" />
        <div className="flex-1 overflow-y-auto pb-16">
          <CategoryGallerySection />
        </div>
      </div>
    );
  }

  // Show success screen
  if (showSuccess) {
    return (
      <WaitlistSuccessScreen 
        autoDismiss={false}
        onContinue={handleSuccessComplete}
      />
    );
  }

  // Show waitlist screen
  if (showWaitlist) {
    return (
      <>
        <WaitlistScreen 
          onProviderQuestion={handleProviderQuestion}
          onSuccess={handleWaitlistComplete}
        />
        <ProviderSelectionModal
          email={waitlistEmail}
          isOpen={showProviderModal}
          onClose={handleProviderModalClose}
          onComplete={handleWaitlistComplete}
        />
      </>
    );
  }

  // Show about cards if user clicked continue
  if (showAboutCards) {
    return <AboutPageContent showSplashHeader={true} onComplete={handleAboutComplete} />;
  }

  return (
    <SplashLayout onContinue={handleContinue}>
      <SplashContent />
    </SplashLayout>
  );
}