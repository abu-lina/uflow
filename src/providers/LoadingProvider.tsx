'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface LoadingContextType {
  isInitialLoad: boolean;
  isPreloading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({
  isInitialLoad: false,
  isPreloading: false,
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  return (
    <LoadingContext.Provider value={{ isInitialLoad: false, isPreloading: false }}>
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
