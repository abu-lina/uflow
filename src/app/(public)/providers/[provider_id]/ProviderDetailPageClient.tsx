'use client';

import { notFound, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useProvider } from '@/hooks/useProvider';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Provider } from '@/services/providers';
import type { CommunityService } from '@/services/communityServices';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

// Lazy load heavy modal component - only loads when needed (desktop view)
const ProviderDetailModal = dynamic(
  () => import('@/components/providers/ProviderDetailModal').then(mod => ({ default: mod.ProviderDetailModal })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-64 w-full max-w-4xl rounded-2xl" />
      </div>
    ),
    ssr: false, // Modal is client-only
  }
);

// Lazy load provider detail page component - only loads on mobile
const ProviderDetailPageComponent = dynamic(
  () => import('@/components/providers/ProviderDetailPage').then(mod => ({ default: mod.ProviderDetailPage })),
  {
    loading: () => (
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 py-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 px-6 py-8">
          <Skeleton className="mx-auto h-96 w-full max-w-[361px] rounded-2xl" />
        </div>
      </div>
    ),
    ssr: false, // Client-only component
  }
);

interface ProviderDetailPageClientProps {
  providerId: string;
  initialData?: Provider | null;
  initialCommunityServices?: CommunityService[];
}

/**
 * Client component that uses React Query to cache provider data
 * 
 * Benefits:
 * - Instant navigation if data already cached
 * - Shows loading skeleton instead of full-page spinner
 * - Prefetches data for faster subsequent loads
 * - Uses modal on desktop, full page on mobile
 */
export function ProviderDetailPageClient({ providerId, initialData, initialCommunityServices }: ProviderDetailPageClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: provider, isLoading, error } = useProvider({
    providerId,
    enabled: true,
    initialData, // Use SSR data if available
  });

  // Handle modal close - navigate back to providers page
  const handleModalClose = () => {
    router.push('/providers');
  };

  // Show loading skeleton while fetching (only if no initial data)
  if (isLoading && !initialData) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Header skeleton */}
        <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 py-4">
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-[361px] space-y-6">
            {/* Image skeleton */}
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />

            {/* Title skeleton */}
            <Skeleton className="h-8 w-3/4" />

            {/* Address skeleton */}
            <Skeleton className="h-5 w-1/2" />

            {/* Action buttons skeleton */}
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>

            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Offers/Needs skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error or not found
  if (error || !provider) {
    return notFound();
  }

  // On desktop, use modal; on mobile, use full page
  if (!isMobile) {
    return (
      <ProviderDetailModal
        initialCommunityServices={initialCommunityServices}
        provider={provider}
        onClose={handleModalClose}
      />
    );
  }

  // Render the actual provider detail page on mobile
  return <ProviderDetailPageComponent initialCommunityServices={initialCommunityServices} provider={provider} />;
}

