'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { hasSeenSplashScreen } from '@/utils/splashUtils';

interface SplashContextType {
  isSplashVisible: boolean;
  setSplashVisible: (visible: boolean) => void;
}

const SplashContext = createContext<SplashContextType | undefined>(undefined);

interface SplashProviderProps {
  children: ReactNode;
}

export function SplashProvider({ children }: SplashProviderProps) {
  const [isSplashVisible, setIsSplashVisible] = useState(false);

  useEffect(() => {
    // Check if splash screen should be visible (first-time user)
    const shouldShowSplash = !hasSeenSplashScreen();
    setIsSplashVisible(shouldShowSplash);
  }, []);

  const setSplashVisible = (visible: boolean) => {
    setIsSplashVisible(visible);
  };

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
    <SplashContext.Provider value={{ isSplashVisible, setSplashVisible }}>
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
