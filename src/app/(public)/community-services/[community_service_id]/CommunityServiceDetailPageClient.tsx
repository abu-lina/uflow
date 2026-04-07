'use client';

import React, { useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useCommunityService } from '@/hooks/useCommunityServices';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { CommunityService } from '@/services/communityServices';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { AdminCommunityServiceDetailButtons } from '@/features/admin/components/AdminCommunityServiceDetailButtons';

// Lazy load heavy modal component - only loads when needed (desktop view)
const CommunityServiceDetailModal = dynamic(
  () => import('@/components/community-services/CommunityServiceDetailModal').then(mod => ({ default: mod.CommunityServiceDetailModal })),
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

interface CommunityServiceDetailPageClientProps {
  communityServiceId: string;
  initialData?: CommunityService | null;
}

/**
 * Transforms a CommunityService record into the Provider shape expected by
 * ProviderDetailModal and ProviderDetailPage. Exported for unit testing.
 */
export function buildProviderShapeFromCommunityService(communityService: CommunityService) {
  return {
    provider_id: communityService.community_service_id,
    provider_name: communityService.community_service_name,
    description: communityService.community_service_description ?? null,
    provider_images: communityService.community_service_images ? JSON.stringify({ urls: communityService.community_service_images }) : null,
    category_id: communityService.category_id || null,
    address_city: communityService.address_city || null,
    social_website: communityService.social_website || null,
    social_instagram: communityService.social_instagram || null,
    contact_email: communityService.contact_email || null,
    contact_phone: communityService.contact_phone || null,
    address_street: communityService.address_street || null,
    address_country: communityService.address_country || null,
    address_zip: communityService.address_zip || null,
    location_latitude: communityService.location_latitude || null,
    location_longitude: communityService.location_longitude || null,
    created_at: communityService.created_at,
    updated_at: communityService.updated_at,
    barakah_effects: communityService.barakah_effects || [],
    offers_ids: communityService.offers_ids || [],
    needs_ids: communityService.needs_ids || [],
    offers: communityService.offers || [],
    needs: communityService.needs || [],
    category: communityService.category ? {
      name_de: communityService.category.name_de || '',
      name_en: communityService.category.name_en,
      category_images: communityService.category.category_images
    } : undefined,
    community_service_id: communityService.community_service_id,
    badges: communityService.badges ?? [],
  };
}

export function CommunityServiceDetailPageClient({ 
  communityServiceId,
  initialData
}: CommunityServiceDetailPageClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAdmin } = useIsAdmin();
  const { data: communityService, isLoading, error } = useCommunityService({
    communityServiceId,
    initialData, // Use SSR data if available
    enabled: true,
  });

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      router.back();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const handleClose = () => {
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
  if (error || !communityService) {
    return notFound();
  }

  // Transform community service to Provider format for compatibility with ProviderDetailPage
  const providerData = buildProviderShapeFromCommunityService(communityService);

  // On desktop, show modal; on mobile, show full page
  if (!isMobile) {
    return (
      <CommunityServiceDetailModal
        communityService={communityService}
        customActionButtons={
          isAdmin ? <AdminCommunityServiceDetailButtons communityServiceId={communityService.community_service_id} variant="desktop" /> : undefined
        }
        onClose={handleClose}
      />
    );
  }

  return (
    <ProviderDetailPageComponent
      customActionButtons={
        isAdmin ? <AdminCommunityServiceDetailButtons communityServiceId={communityService.community_service_id} variant="mobile" /> : undefined
      }
      provider={providerData}
    />
  );
}

