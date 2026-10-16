'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { WaitlistFlowState } from '@/hooks/useWaitlistFlow';
import { hasSeenSplashScreen, markSplashScreenAsSeen } from '@/utils/splashUtils';

interface SplashContextType {
  isSplashVisible: boolean;
  isFirstVisit: boolean;
  /** Current onboarding flow step shown on `/`; null when the flow isn't mounted. */
  onboardingStep: WaitlistFlowState | null;
  setOnboardingStep: (step: WaitlistFlowState | null) => void;
  setSplashVisible: (visible: boolean) => void;
  dismissSplash: () => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

interface SplashProviderProps {
  children: ReactNode;
}

export function SplashProvider({ children }: SplashProviderProps) {
  const [isSplashVisible, setIsSplashVisible] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<WaitlistFlowState | null>(null);

  useEffect(() => {
    const firstVisit = !hasSeenSplashScreen();
    setIsFirstVisit(firstVisit);
    setIsSplashVisible(firstVisit);
  }, []);

  const setSplashVisible = useCallback((visible: boolean) => {
    setIsSplashVisible(visible);
  }, []);

  const dismissSplash = useCallback(() => {
    markSplashScreenAsSeen();
    setIsSplashVisible(false);
    setIsFirstVisit(false);
  }, []);

  // Listen for localStorage changes (for debug reset)
  useEffect(() => {
    const handleStorageChange = () => {
      const shouldShowSplash = !hasSeenSplashScreen();
      setIsSplashVisible(shouldShowSplash);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <SplashContext.Provider
      value={{
        isSplashVisible,
        isFirstVisit,
        onboardingStep,
        setOnboardingStep,
        setSplashVisible,
        dismissSplash,
      }}
    >
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (context === undefined) {
    throw new Error('useSplash must be used within a SplashProvider');
  }
  return context;
}
