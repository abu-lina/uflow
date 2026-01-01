import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createProviderCommunityServiceRelationship } from './communityServices';

export interface CreateProviderResult {
  provider_id?: string;
  community_service_id?: string;
}

/**
 * Creates a provider or community service from form data
 * Handles image uploads, entity creation, and relationships
 * 
 * @param formData - The form data containing all provider/service information
 * @param user - The authenticated user (null for anonymous recommendations)
 * @param isRecommendationMode - Whether this is a recommendation (anonymous) or owner creation
 * @returns The created entity ID (provider_id or community_service_id)
 */
export async function createProviderOrService(
  formData: ProviderFormData,
  user: User | null,
  isRecommendationMode: boolean
): Promise<CreateProviderResult> {
  const isAnonymous = !user && isRecommendationMode;
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
  const isOwner = formData.creationMode === 'owner';

  // Upload images if any exist
  let uploadedUrls: string[] = [];
  if (formData.images && formData.images.length > 0) {
    const bucketName = isCommunityService ? 'community-service-images' : 'provider-images';
    const folderName = isCommunityService ? 'community-services' : 'providers';

    for (const imageFile of formData.images) {
      const fileExt = imageFile.name.split('.').pop();
      // Use different naming for anonymous users
      const fileName = isAnonymous
        ? `anon-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        : `${user?.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folderName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }
  }

  if (isCommunityService) {
    // Create community service
    const insertData = {
      community_service_name: formData.title,
      community_service_description: formData.description || null,
      address_street: formData.isOnlineBusiness ? null : (formData.street || null),
      address_zip: formData.isOnlineBusiness ? null : (formData.zip || null),
      address_city: formData.isOnlineBusiness ? null : (formData.city || null),
      address_country: formData.isOnlineBusiness ? null : (formData.country || null),
      show_address: formData.isOnlineBusiness ? false : (formData.showAddress !== undefined ? formData.showAddress : true),
      category_id: formData.category || null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      barakah_effects: formData.tags || [],
      user_created_id: isAnonymous ? null : user?.id || null,
      provider_id: isOwner && !isAnonymous ? user?.id || null : null,
      community_service_images: uploadedUrls.length > 0 ? uploadedUrls : null,
      offers_ids: formData.offers_ids || [],
      needs_ids: formData.needs_ids || [],
      review_status: 'approved' as const, // Community services are auto-approved
    };

    const { data: createdService, error: serviceError } = await supabase
      .from('community_services')
      .insert([insertData])
      .select('community_service_id')
      .single();

    if (serviceError) {
      console.error('Error creating community service:', serviceError);
      throw serviceError;
    }

    if (!createdService) {
      throw new Error('Community service created but no data returned');
    }

    return { community_service_id: createdService.community_service_id };
  } else {
    // Create provider
    const insertData = {
      provider_name: formData.title,
      provider_description: formData.description || null,
      // If online business, all address fields are null
      address_street: formData.isOnlineBusiness ? null : (formData.street || null),
      address_zip: formData.isOnlineBusiness ? null : (formData.zip || null),
      address_city: formData.isOnlineBusiness ? null : (formData.city || null),
      address_country: formData.isOnlineBusiness ? null : (formData.country || null),
      show_address: formData.isOnlineBusiness ? false : (formData.showAddress !== undefined ? formData.showAddress : true),
      category_id: formData.category || null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      barakah_effects: formData.tags || [],
      // user_created_id: Set to NULL for anonymous recommendations, otherwise track creator
      // provider_owner_id: Only set in owner mode (when user is the actual business owner)
      user_created_id: isAnonymous ? null : user?.id || null,
      provider_owner_id: isOwner && !isAnonymous ? user?.id || null : null,
      provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
      offers_ids: formData.offers_ids || [],
      needs_ids: formData.needs_ids || [],
      review_status: 'pending' as const, // Providers need review
    };

    const { data: createdProvider, error: providerError } = await supabase
      .from('providers')
      .insert([insertData])
      .select('provider_id')
      .single();

    if (providerError) {
      console.error('Error creating provider:', providerError);
      throw providerError;
    }

    if (!createdProvider) {
      throw new Error('Provider created but no data returned');
    }

    // Create provider-community service relationships for all selected services
    if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
      for (const serviceId of formData.selectedCommunityServiceIds) {
        const { error: relationshipError } = await createProviderCommunityServiceRelationship(
          createdProvider.provider_id,
          serviceId
        );

        if (relationshipError) {
          console.error('Error creating relationship:', relationshipError);
          // Don't throw here - the provider was created successfully
        }
      }
    }

    return { provider_id: createdProvider.provider_id };
  }
}




