// React Query hook for fetching and caching provider data
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProviderById, type Provider } from '@/services/providers';

interface UseProviderOptions {
  providerId: string;
  enabled?: boolean;
  initialData?: Provider | null; // For SSR initial data
}

/**
 * Hook for fetching and caching provider data
 * 
 * Features:
 * - Client-side caching (5 minutes)
 * - Instant navigation if data already cached
 * - Supports SSR initial data
 * - Automatic refetching on stale data
 */
export function useProvider({ providerId, enabled = true, initialData }: UseProviderOptions) {
  return useQuery<Provider | null, Error>({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      return await getProviderById(providerId);
    },
    enabled: enabled && !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - stays in cache
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    retry: 1, // Only retry once on failure
    retryOnMount: false, // Don't retry on mount
    placeholderData: (previousData) => previousData, // Show cached data while refetching
    initialData: initialData ?? undefined, // Use SSR data if available
    initialDataUpdatedAt: initialData ? Date.now() : undefined, // Mark SSR data as fresh
  });
}

/**
 * Prefetch provider data (for hover/optimistic loading)
 */
export function usePrefetchProvider() {
  const queryClient = useQueryClient();
  
  return (providerId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['provider', providerId],
      queryFn: async () => {
        if (!providerId) return null;
        return await getProviderById(providerId);
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}
