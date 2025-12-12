'use client';

import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { AuthProvider } from '@/providers/auth-provider';
import { AuthSyncer } from '@/providers/AuthSyncer';
import { FilterProvider } from '@/providers/filter-provider';
import { FormProvider } from '@/providers/form-provider';
import { SearchProvider } from '@/providers/search-provider';
import { SplashProvider } from '@/providers/splash-provider';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { LanguageUpdater } from '@/components/layout/LanguageUpdater';
import type { User } from '@supabase/supabase-js';

interface ClientProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

// Create QueryClient configuration outside component to avoid webpack bundling issues
const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      retryOnMount: false,
    },
  },
};

export function ClientProviders({ children, initialUser }: ClientProvidersProps) {
  // Use useState with lazy initialization to ensure QueryClient is only created once
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LanguageUpdater />
        <AuthProvider initialUser={initialUser}>
          <AuthSyncer />
          <FormProvider>
            <SplashProvider>
              <SearchProvider>
                <FilterProvider>
                  {children}
                  <Toaster position="top-center" />
                  <PWAInstallPrompt />
                </FilterProvider>
              </SearchProvider>
            </SplashProvider>
          </FormProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
