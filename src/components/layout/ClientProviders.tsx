'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/design-system';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { cleanupServiceWorkers } from '@/lib/pwa/serviceWorkerCleanup';
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

const TOASTER_TOP_OFFSET = 'calc(env(safe-area-inset-top) + 16px)';

// QueryClient configuration - defined as a function to avoid webpack evaluation issues
function makeQueryClient() {
  return new QueryClient({
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
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function ClientProviders({ children, initialUser }: ClientProvidersProps) {
  // Use useState with lazy initialization to ensure QueryClient is only created once
  const [queryClient] = useState(() => getQueryClient());

  // Run service worker cleanup on mount (once per session)
  useEffect(() => {
    cleanupServiceWorkers();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="default">
        <LanguageProvider>
          <LanguageUpdater />
          <AuthProvider initialUser={initialUser}>
            <AuthSyncer />
            <FormProvider>
              <SplashProvider>
                <SearchProvider>
                  <FilterProvider>
                    {children}
                    <Toaster
                      mobileOffset={{ top: TOASTER_TOP_OFFSET, left: '12px', right: '12px' }}
                      offset={{ top: TOASTER_TOP_OFFSET, left: '16px', right: '16px' }}
                      position="top-center"
                    />
                    <PWAInstallPrompt />
                  </FilterProvider>
                </SearchProvider>
              </SplashProvider>
            </FormProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
