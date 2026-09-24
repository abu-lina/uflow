'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useProvider } from '@/hooks/useProvider';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { Provider } from '@/services/providers';
import type { CommunityService } from '@/services/communityServices';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { AdminProviderDetailButtons } from '@/features/admin/components/AdminProviderDetailButtons';

// Lazy load heavy modal component - only loads when needed (desktop view)
const ProviderDetailModal = dynamic(
  () =>
    import('@/features/providers/pages/ProviderDetailModal').then((mod) => ({
      default: mod.ProviderDetailModal,
    })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-64 w-full max-w-4xl rounded-2xl" />
      </div>
    ),
    ssr: false, // Modal is client-only
  },
);

// Lazy load provider detail page component - only loads on mobile
// SSR is enabled so Next.js can render real content server-side instead of
// showing a skeleton fallback that causes a visible flash on navigation.
const ProviderDetailPageComponent = dynamic(() =>
  import('@/features/providers/pages/ProviderDetailPage').then((mod) => ({
    default: mod.ProviderDetailPage,
  })),
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
export function ProviderDetailPageClient({
  providerId,
  initialData,
  initialCommunityServices,
}: ProviderDetailPageClientProps) {
  const router = useRouter();
  const { isAdmin } = useIsAdmin();
  const {
    data: provider,
    isLoading,
    error,
  } = useProvider({
    providerId,
    enabled: true,
    initialData, // Use SSR data if available
  });

  // Only mount the desktop modal on md+ screens to avoid portal escape on mobile.
  // The modal uses createPortal to document.body, so CSS hidden/block can't hide it.
  // Safe to gate with JS because the modal's dynamic import already has ssr: false.
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setShowDesktopModal(mql.matches);

    const handler = (e: MediaQueryListEvent) => setShowDesktopModal(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Handle modal close - navigate back to providers page
  const handleModalClose = () => {
    router.back();
  };

  // Show loading skeleton while fetching (only if no initial data)
  if (isLoading && !initialData) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Header skeleton */}
        <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
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

  // Mobile: SSR-rendered full page, CSS-hidden on desktop
  // Desktop: client-only modal, JS-gated to prevent portal escape on mobile
  return (
    <>
      <div className="md:hidden">
        <ProviderDetailPageComponent
          customActionButtons={
            isAdmin ? (
              <AdminProviderDetailButtons providerId={providerId} variant="mobile" />
            ) : undefined
          }
          initialCommunityServices={initialCommunityServices}
          provider={provider}
        />
      </div>
      {showDesktopModal && (
        <ProviderDetailModal
          customActionButtons={
            isAdmin ? (
              <AdminProviderDetailButtons providerId={providerId} variant="desktop" />
            ) : undefined
          }
          initialCommunityServices={initialCommunityServices}
          provider={provider}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
