import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { getCommunityServiceById } from '@/services/communityServices';

import { CommunityServiceDetailPageClient } from './CommunityServiceDetailPageClient';

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

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <CommunityServiceDetailPageClient communityService={communityService} />
    </Suspense>
  );
}

