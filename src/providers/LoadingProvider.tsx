'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { AppLoader } from '@/components/ui/AppLoader';

interface LoadingContextType {
  isInitialLoad: boolean;
  isPreloading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  isInitialLoad: true,
  isPreloading: true,
});

const MAIN_ROUTES = ['/', '/providers', '/profile'];

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isPreloading, setIsPreloading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Preload all main routes and their data
    const preloadRoutes = async () => {
      try {
        // Start preloading routes
        const preloadPromises = MAIN_ROUTES.map((route) => router.prefetch(route));

        // Wait for all routes to be prefetched
        await Promise.all(preloadPromises);

        // Small delay to ensure smooth transition
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Mark preloading as complete
        setIsPreloading(false);

        // Mark initial load as complete after a short delay
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 200);
      } catch (error) {
        console.error('Error preloading routes:', error);
        // Even if preloading fails, we should show the app
        setIsPreloading(false);
        setIsInitialLoad(false);
      }
    };

    preloadRoutes();
  }, [router]);

  return (
    <LoadingContext.Provider value={{ isInitialLoad, isPreloading }}>
      <div className="relative min-h-[100dvh]">
        {isPreloading && <AppLoader />}
        {children}
      </div>
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
