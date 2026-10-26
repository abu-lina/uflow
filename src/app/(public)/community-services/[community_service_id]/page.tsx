import { Suspense } from 'react';

import { getCommunityServiceById } from '@/services/communityServices.server';

import { CommunityServiceDetailPageClient } from './CommunityServiceDetailPageClient';
import { ImagePreloader } from '@/components/community-services/ImagePreloader';
import { isAllowedImageUrl } from '@/utils/imageUtils';

// Helper function to get first image URL for preloading
function getFirstImageUrl(communityService: {
  community_service_images?: string[] | null;
}): string | null {
  const firstImage = communityService.community_service_images?.[0];
  return isAllowedImageUrl(firstImage) ? firstImage : null;
}

export default async function CommunityServiceDetailPage({
  params,
}: {
  params: Promise<{ community_service_id: string }>;
}) {
  const { community_service_id } = await params;

  // Fetch the community service — pass nullable result to client (Plan 082: M1)
  // Do NOT call notFound() here; the client component handles null gracefully via
  // React Query, allowing re-fetch and proper loading/error states.
  const communityService = await getCommunityServiceById(community_service_id);

  // Only preload the first image if we have data (ImagePreloader requires non-null)
  const firstImageUrl = communityService ? getFirstImageUrl(communityService) : null;

  return (
    <>
      {firstImageUrl && <ImagePreloader imageUrl={firstImageUrl} />}
      <Suspense
        fallback={<div className="h-screen-fix flex items-center justify-center">Loading...</div>}
      >
        <CommunityServiceDetailPageClient
          communityServiceId={community_service_id}
          initialData={communityService}
        />
      </Suspense>
    </>
  );
}
