import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { getCommunityServiceById } from '@/services/communityServices';

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
  
  // Fetch the community service
  const communityService = await getCommunityServiceById(community_service_id);
  
  if (!communityService) {
    return notFound();
  }

  const firstImageUrl = getFirstImageUrl(communityService);

  return (
    <>
      <ImagePreloader imageUrl={firstImageUrl} />
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <CommunityServiceDetailPageClient communityService={communityService} />
      </Suspense>
    </>
  );
}

