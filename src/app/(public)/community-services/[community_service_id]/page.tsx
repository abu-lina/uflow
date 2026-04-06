import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getCommunityServiceById } from '@/services/communityServices.server';

import { CommunityServiceDetailPageClient } from './CommunityServiceDetailPageClient';
import { ImagePreloader } from '@/components/community-services/ImagePreloader';

// Helper function to get first image URL for preloading
function getFirstImageUrl(communityService: { community_service_images?: string[] | null }): string | null {
  if (!communityService.community_service_images || communityService.community_service_images.length === 0) {
    return null;
  }

  // Check if images are from trusted domain (Supabase)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const supabaseHostname = new URL(supabaseUrl).hostname;
    const firstImage = communityService.community_service_images[0];
    
    if (!firstImage) return null;
    
    try {
      const imageUrl = new URL(firstImage);
      if (imageUrl.hostname === supabaseHostname) {
        return firstImage;
      }
    } catch {
      // Invalid URL, skip
    }
    
    return null;
  } catch {
    return null;
  }
}

export default async function CommunityServiceDetailPage({ 
  params 
}: { 
  params: Promise<{ community_service_id: string }> 
}) {
  const { community_service_id } = await params;
  
  // Fetch the community service — pass nullable result to client (Plan 082: M1)
  // Do NOT call notFound() here; the client component handles null gracefully via
  // React Query, allowing re-fetch and proper loading/error states.
  const communityService = await getCommunityServiceById(community_service_id);

  if (!communityService) {
    notFound();
  }

  // Only preload the first image if we have data (ImagePreloader requires non-null)
  const firstImageUrl = getFirstImageUrl(communityService);

  return (
    <>
      {firstImageUrl && <ImagePreloader imageUrl={firstImageUrl} />}
      <Suspense fallback={<div className="flex h-screen-fix items-center justify-center">Loading...</div>}>
        <CommunityServiceDetailPageClient
          communityService={communityService}
        />
      </Suspense>
    </>
  );
}

