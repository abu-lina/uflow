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
import type { User } from '@supabase/supabase-js';

interface ClientProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function ClientProviders({ children, initialUser }: ClientProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
