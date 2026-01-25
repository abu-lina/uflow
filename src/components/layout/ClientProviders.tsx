'use client';

import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
