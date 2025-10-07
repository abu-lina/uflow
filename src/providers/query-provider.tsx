'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Data stays in cache for 30 minutes (renamed from cacheTime in React Query v5)
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data exists
            refetchOnMount: false,
            // Retry only once on failure
            retry: 1,
            // Don't retry on 4xx errors
            retryOnMount: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
