'use client';

import { notFound, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useCommunityService } from '@/hooks/useCommunityServices';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { CommunityService } from '@/services/communityServices';
import type { Provider } from '@/services/providers';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { AdminCommunityServiceDetailButtons } from '@/features/admin/components/AdminCommunityServiceDetailButtons';

// Lazy load the ProviderDetailModal (Plan 082: M3/D4 — reuse provider design system for desktop)
// @deprecated-replaced: CommunityServiceDetailModal is replaced by ProviderDetailModal for this page (Plan 082)
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

// Lazy load provider detail page component for mobile
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

/**
 * Transform a CommunityService to the Provider shape required by ProviderDetailModal
 * and ProviderDetailPage. Exported for testability (Plan 082: M4).
 *
 * Key: community_service_id is propagated so ProviderDetailModal can detect the entity
 * type and use bookmarkableType: 'community_service' (Critic F1 fix).
 */
export function buildProviderShapeFromCommunityService(cs: CommunityService): Provider {
  return {
    // Use community_service_id as provider_id so downstream components have a stable ID
    provider_id: cs.community_service_id,
    provider_name: cs.community_service_name,
    // ProviderDetailModal parses provider_images as JSON string: { urls: string[] }
    provider_images:
      cs.community_service_images && cs.community_service_images.length > 0
        ? JSON.stringify({ urls: cs.community_service_images })
        : null,
    category_id: cs.category_id ?? null,
    address_city: cs.address_city ?? null,
    address_street: cs.address_street ?? null,
    address_zip: cs.address_zip ?? null,
    address_country: cs.address_country ?? null,
    social_website: cs.social_website ?? null,
    social_instagram: cs.social_instagram ?? null,
    contact_email: cs.contact_email ?? null,
    contact_phone: cs.contact_phone ?? null,
    location_latitude: cs.location_latitude ?? null,
    location_longitude: cs.location_longitude ?? null,
    created_at: cs.created_at,
    updated_at: cs.updated_at,
    barakah_effects: cs.barakah_effects ?? [],
    offers_ids: cs.offers_ids ?? [],
    needs_ids: cs.needs_ids ?? [],
    // F6 fix: map description field so it's available if components render it
    description: cs.community_service_description ?? null,
    offers: cs.offers ?? [],
    needs: cs.needs ?? [],
    category: cs.category
      ? {
          name_de: cs.category.name_de ?? '',
          name_en: cs.category.name_en,
          category_images: cs.category.category_images,
        }
      : undefined,
    show_address: cs.show_address,
    badges: cs.badges ?? [],
    // KEY: Must be set so ProviderDetailModal detects this as a community service
    // and uses bookmarkableType: 'community_service' (Critic F1)
    community_service_id: cs.community_service_id,
  };
}

interface CommunityServiceDetailPageClientProps {
  communityServiceId: string;
  initialData?: CommunityService | null;
}

/**
 * Client component for community service detail page (Plan 082: M3)
 *
 * Architecture parity with ProviderDetailPageClient:
 * - Uses useCommunityService React Query hook for client-side caching + re-fetch
 * - Shows loading skeleton when no initialData
 * - Calls notFound() only after React Query confirms error/null
 * - Desktop: renders via ProviderDetailModal for full design system compliance
 * - Mobile: renders via ProviderDetailPage (already supports community services)
 */
export function CommunityServiceDetailPageClient({
  communityServiceId,
  initialData,
}: CommunityServiceDetailPageClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAdmin } = useIsAdmin();
  const { data: communityService, isLoading, error } = useCommunityService({
    communityServiceId,
    initialData,
    enabled: true,
  });

  const handleClose = () => {
    router.back();
  };

  // Show loading skeleton while fetching (only if no initial data)
  if (isLoading && !initialData) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-[361px] space-y-6">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Graceful not-found: only after React Query confirms data is missing
  if (error || (!isLoading && !communityService)) {
    return notFound();
  }

  // Data available — build the provider-compatible shape
  const providerShape = communityService
    ? buildProviderShapeFromCommunityService(communityService)
    : null;

  if (!providerShape) {
    return notFound();
  }

  // Desktop: render through ProviderDetailModal for full design system compliance
  if (!isMobile) {
    return (
      <ProviderDetailModal
        customActionButtons={
          isAdmin ? (
            <AdminCommunityServiceDetailButtons
              communityServiceId={communityServiceId}
              variant="desktop"
            />
          ) : undefined
        }
        initialCommunityServices={[]} // Community services don't have sub-services
        provider={providerShape}
        onClose={handleClose}
      />
    );
  }

  // Mobile: render through ProviderDetailPage (already supports community services
  // via isCommunityService check at line 141 of ProviderDetailPage.tsx)
  return (
    <ProviderDetailPageComponent
      customActionButtons={
        isAdmin ? (
          <AdminCommunityServiceDetailButtons
            communityServiceId={communityServiceId}
            variant="mobile"
          />
        ) : undefined
      }
      provider={providerShape}
    />
  );
}


