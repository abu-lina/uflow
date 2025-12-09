'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useIsMobile } from '@/hooks/useIsMobile';
import type { CommunityService } from '@/services/communityServices';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

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
  communityService: CommunityService;
}

export function CommunityServiceDetailPageClient({ 
  communityService 
}: CommunityServiceDetailPageClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

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

  // Transform community service to Provider format for compatibility with ProviderDetailPage
  const providerData = {
    provider_id: communityService.community_service_id,
    provider_name: communityService.community_service_name,
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
  };

  // On desktop, show modal; on mobile, show full page
  if (!isMobile) {
    return (
      <CommunityServiceDetailModal
        communityService={communityService}
        onClose={handleClose}
      />
    );
  }

  return <ProviderDetailPageComponent provider={providerData} />;
}

