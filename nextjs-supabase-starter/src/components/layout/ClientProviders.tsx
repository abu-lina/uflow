'use client';

import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/providers/auth-provider';
import { AuthSyncer } from '@/providers/AuthSyncer';
import type { User } from '@supabase/supabase-js';

interface ClientProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
} as const;

export function ClientProviders({ children, initialUser }: ClientProvidersProps) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={initialUser}>
        <AuthSyncer />
        {children}
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

