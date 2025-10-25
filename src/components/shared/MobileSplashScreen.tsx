'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSplash } from '@/providers/splash-provider';
import { AboutPageContent } from '@/app/(public)/about/AboutPageContent';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';
import { SplashLayout } from '@/components/layout/SplashLayout';
import { SplashContent } from '@/components/shared/SplashContent';

interface MobileSplashScreenProps {
  onContinue?: () => void;
}

export function MobileSplashScreen({ onContinue }: MobileSplashScreenProps) {
  const router = useRouter();
  const { isSplashVisible, dismissSplash } = useSplash();
  const [showAboutCards, setShowAboutCards] = useState(false);


  const handleContinue = () => {
    setShowAboutCards(true);
  };

  const handleAboutComplete = () => {
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