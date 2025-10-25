'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { hasSeenSplashScreen, markSplashScreenAsSeen } from '@/utils/splashUtils';

interface SplashContextType {
  isSplashVisible: boolean;
  isFirstVisit: boolean;
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

  useEffect(() => {
    // Check if splash screen should be visible (first-time user)
    const firstVisit = !hasSeenSplashScreen();
    setIsFirstVisit(firstVisit);
    setIsSplashVisible(firstVisit);
    
    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SPLASH] First visit:', firstVisit);
      console.log('[SPLASH] localStorage value:', localStorage.getItem('hasSeenSplashScreen'));
    }
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
    <SplashContext.Provider value={{ isSplashVisible, isFirstVisit, setSplashVisible, dismissSplash }}>
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
