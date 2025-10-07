// React Query hooks for community services with caching
import { useQuery } from '@tanstack/react-query';
import { getCommunityServicesForProvider, getCommunityServices, getCommunityServicesByCategory, type CommunityService } from '@/services/community_services';

// Hook for getting community services for a specific provider
export function useCommunityServicesForProvider(providerId: string) {
  return useQuery<CommunityService[], Error>({
    queryKey: ['community-services', 'provider', providerId],
    queryFn: () => getCommunityServicesForProvider(providerId),
    enabled: !!providerId, // Only run if providerId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - stays in cache (renamed from cacheTime in v5)
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    retry: 1, // Only retry once on failure
    retryOnMount: false, // Don't retry on mount
  });
}

// Hook for getting all community services (for other pages)
export function useAllCommunityServices() {
  return useQuery<CommunityService[], Error>({
    queryKey: ['community-services', 'all'],
    queryFn: getCommunityServices,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

// Hook for getting community services by category
export function useCommunityServicesByCategory(categoryId: string) {
  return useQuery<CommunityService[], Error>({
    queryKey: ['community-services', 'category', categoryId],
    queryFn: () => getCommunityServicesByCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

// Helper hook for getting cached data without triggering a fetch
export function useCachedCommunityServices(providerId: string) {
  const { data, isLoading, error } = useCommunityServicesForProvider(providerId);
  
  return {
    communityServices: data || [],
    isLoading,
    error,
    hasData: !!data && data.length > 0,
  };
}