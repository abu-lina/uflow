import { notFound } from 'next/navigation';

import { ProviderDetailPage as ProviderDetailPageComponent } from '@/components/providers/ProviderDetailPage';
import { getCommunityServiceById } from '@/services/communityServices';

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

  // Transform community service to Provider format for compatibility with ProviderDetailPage
  const providerData = {
    provider_id: communityService.community_service_id,
    provider_name: communityService.community_service_name,
    provider_images: communityService.community_service_images ? JSON.stringify(communityService.community_service_images) : null,
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

  return <ProviderDetailPageComponent provider={providerData} />;
}

