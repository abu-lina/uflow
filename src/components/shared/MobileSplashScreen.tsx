'use client';

import { useState, useEffect } from 'react';
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
import { EarlyAccessScreen } from '@/components/shared/EarlyAccessScreen';
import { CitySelectionModal } from '@/components/shared/CitySelectionModal';

interface MobileSplashScreenProps {
  onContinue?: () => void;
}

interface WaitlistStatusResponse {
  data: {
    email: string;
    has_seen_early_access: boolean;
    skipped_early_access: boolean;
    selected_city: string | null;
  } | null;
  error: { message: string } | null;
}

export function MobileSplashScreen({ onContinue: _onContinue }: MobileSplashScreenProps) {
  const router = useRouter();
  const { isSplashVisible, dismissSplash } = useSplash();
  const [showAboutCards, setShowAboutCards] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistToken, setWaitlistToken] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showEarlyAccess, setShowEarlyAccess] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAboutFromEarlyAccess, setShowAboutFromEarlyAccess] = useState(false);
  const [isCheckingWaitlistStatus, setIsCheckingWaitlistStatus] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted after hydration to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check waitlist status on mount to restore early access screen if needed
  useEffect(() => {
    // Only run on client after mount
    if (!isMounted) return;

    // If we already have early access state from sessionStorage, use it immediately
    const shouldShowEarlyAccess = sessionStorage.getItem('showEarlyAccess') === 'true';
    const storedEmail = sessionStorage.getItem('waitlistEmail');
    if (shouldShowEarlyAccess && storedEmail) {
      setWaitlistEmail(storedEmail);
      setShowEarlyAccess(true);
      setIsCheckingWaitlistStatus(false);
      return; // Skip API call, we already have the state
    }

    const checkWaitlistStatus = async () => {
      try {
        const response = await fetch('/api/waitlist/status');
        const data: WaitlistStatusResponse = await response.json();

        if (data.data && !data.data.has_seen_early_access) {
          // User has joined waitlist but hasn't seen early access screen yet
          setWaitlistEmail(data.data.email);
          setShowEarlyAccess(true);
          // Store in sessionStorage to avoid flash on next navigation
          sessionStorage.setItem('showEarlyAccess', 'true');
          sessionStorage.setItem('waitlistEmail', data.data.email);
        } else if (data.data && data.data.has_seen_early_access) {
          // User has already seen early access - clear sessionStorage
          // Component will naturally show galleries if splash is dismissed
          sessionStorage.removeItem('showEarlyAccess');
          sessionStorage.removeItem('waitlistEmail');
        } else {
          // No waitlist entry - clear sessionStorage
          sessionStorage.removeItem('showEarlyAccess');
          sessionStorage.removeItem('waitlistEmail');
        }
      } catch (error) {
        console.error('[MobileSplashScreen] Failed to check waitlist status:', error);
        // Don't block user flow on error
      } finally {
        setIsCheckingWaitlistStatus(false);
      }
    };

    checkWaitlistStatus();
  }, [isMounted]);

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

  const handleWaitlistSuccess = (email: string, token?: string) => {
    // Called when waitlist submission succeeds without provider modal
    setWaitlistEmail(email);
    if (token) {
      setWaitlistToken(token);
    }
    handleWaitlistComplete(token);
  };

  const handleProviderModalClose = () => {
    setShowProviderModal(false);
  };

  const handleWaitlistComplete = (token?: string) => {
    // Store token if provided
    if (token) {
      setWaitlistToken(token);
    }
    
    // Show success screen
    setShowWaitlist(false);
    setShowProviderModal(false);
    setShowSuccess(true);
  };

  const handleSuccessComplete = () => {
    // After success screen, show early access screen (NEW FLOW)
    setShowSuccess(false);
    setShowEarlyAccess(true);
  };

  const handleSuggestProvider = () => {
    // Navigate to provider recommendation flow
    // Keep early access state in sessionStorage so we can restore it when user comes back
    sessionStorage.setItem('showEarlyAccess', 'true');
    sessionStorage.setItem('waitlistEmail', waitlistEmail);
    dismissSplash();
    router.push('/recommend-provider');
  };

  const handleSelectCity = () => {
    // Open city selection modal
    setShowCityModal(true);
  };

  const handleLearnMore = () => {
    // Show about page from early access context
    setShowEarlyAccess(false);
    setShowAboutFromEarlyAccess(true);
  };

  const handleEarlyAccessComplete = () => {
    // User skipped early access - dismiss splash and show galleries
    // Don't redirect - let them stay on waitlist page to see the app
    // Clear early access flag from sessionStorage
    sessionStorage.removeItem('showEarlyAccess');
    sessionStorage.removeItem('waitlistEmail');
    dismissSplash();
  };

  const handleCitySelected = (city: string) => {
    // City selected - close modal, could show success message
    console.log('[Early Access] City selected:', city);
    setShowCityModal(false);
  };

  const handleAboutCompleteFromEarlyAccess = () => {
    // Return to early access screen after viewing about page
    setShowAboutFromEarlyAccess(false);
    setShowEarlyAccess(true);
  };

  // During SSR and initial hydration, show consistent content to prevent hydration mismatch
  // Only show loading/early access after component is mounted on client
  if (!isMounted || isCheckingWaitlistStatus) {
    // Show splash layout during initial render to match server
    // This prevents hydration mismatch
    return (
      <SplashLayout onContinue={handleContinue}>
        <SplashContent />
      </SplashLayout>
    );
  }

  // Show early access screen (NEW) - check this BEFORE isSplashVisible
  // so users see early access even if splash was dismissed
  if (showEarlyAccess) {
    return (
      <>
        <EarlyAccessScreen
          email={waitlistEmail}
          waitlistToken={waitlistToken || ''} // Empty string if not available (will use cookie)
          onComplete={handleEarlyAccessComplete}
          onLearnMore={handleLearnMore}
          onSelectCity={handleSelectCity}
          onSuggestProvider={handleSuggestProvider}
        />
        {/* City Selection Modal */}
        <CitySelectionModal
          email={waitlistEmail}
          isOpen={showCityModal}
          waitlistToken={waitlistToken || ''} // Empty string if not available (will use cookie)
          onCitySelected={handleCitySelected}
          onClose={() => setShowCityModal(false)}
        />
      </>
    );
  }

  // Show about page from early access context
  if (showAboutFromEarlyAccess) {
    return <AboutPageContent showSplashHeader={true} onComplete={handleAboutCompleteFromEarlyAccess} />;
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
          onSuccess={handleWaitlistSuccess}
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

  // Show galleries for returning users (only if splash is not visible AND not showing early access)
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

  return (
    <SplashLayout onContinue={handleContinue}>
      <SplashContent />
    </SplashLayout>
  );
}