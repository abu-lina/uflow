import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createProviderCommunityServiceRelationship } from './communityServices';
import { TrustLevel } from '@/types/badges';

// Extended form data type that may include userEmail for anonymous recommendations
type ExtendedProviderFormData = ProviderFormData & {
  userEmail?: string;
};

export interface CreateProviderResult {
  provider_id?: string;
  community_service_id?: string;
}

const TAG_SYNONYMS = {
  muslim: new Set(['muslim', 'muslim_owned', 'muslim-owned']),
  prayer: new Set(['gebet', 'gebetsraum', 'gebetsfreundlich', 'prayer', 'prayer_space', 'prayer-friendly']),
  donations: new Set(['spenden', 'spendenbereit', 'accepts_donations', 'supports_sadaqah', 'sadaqah']),
  parking: new Set(['parken', 'parking', 'has_parking']),
  solidarity: new Set(['solidaritaet', 'solidarity', 'solidarity_pricing']),
} as const;

const FORM_TAG_TO_BADGE_KEY = {
  muslim: 'MUSLIM_OWNED',
  prayer: 'PRAYER_FRIENDLY',
  donations: 'SUPPORTS_SADAQAH',
} as const;

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
  formData: ExtendedProviderFormData,
  user: User | null,
  isRecommendationMode: boolean
): Promise<CreateProviderResult> {
  // Explicitly check for null/undefined user in recommendation mode
  const isAnonymous = (user === null || user === undefined) && isRecommendationMode;
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
    // Generate UUID client-side to avoid needing SELECT after INSERT
    // This bypasses the SELECT policy issue for pending reviews
    const generatedServiceId = crypto.randomUUID();
    
    // CRITICAL: Always explicitly set user_created_id and provider_id directly in the object
    // The RLS policy requires user_created_id to be NULL for anonymous users
    const insertData: Record<string, unknown> = {
      community_service_id: generatedServiceId,
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
      community_service_images: uploadedUrls.length > 0 ? uploadedUrls : null,
      offers_ids: formData.offers_ids || [],
      needs_ids: formData.needs_ids || [],
      review_status: 'pending' as const, // All submissions go through review
      // CRITICAL: Always explicitly set these fields, even if null
      // The RLS policy requires user_created_id to be NULL for anonymous users
      user_created_id: isAnonymous ? null : (user?.id ?? null),
      provider_id: isAnonymous ? null : ((isOwner && user?.id) ? user.id : null),
      // Store recommender email for anonymous recommendations (with consent)
      recommender_email: isAnonymous && formData.userEmail ? formData.userEmail : null,
    };

    // Insert without SELECT to avoid SELECT policy blocking pending reviews
    const { error: serviceError } = await supabase
      .from('community_services')
      .insert([insertData]);

    if (serviceError) {
      console.error('Error creating community service:', serviceError);
      throw serviceError;
    }

    return { community_service_id: generatedServiceId };
  } else {
    // Create provider
    // Generate UUID client-side to avoid needing SELECT after INSERT
    // This bypasses the SELECT policy issue for pending reviews
    const generatedProviderId = crypto.randomUUID();

    const normalizedTags = new Set(
      (formData.tags || [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    );

    const hasMuslimOwnedTag = Array.from(TAG_SYNONYMS.muslim).some((tag) => normalizedTags.has(tag));
    const hasPrayerTag = Array.from(TAG_SYNONYMS.prayer).some((tag) => normalizedTags.has(tag));
    const hasDonationsTag = Array.from(TAG_SYNONYMS.donations).some((tag) => normalizedTags.has(tag));
    const hasParkingTag = Array.from(TAG_SYNONYMS.parking).some((tag) => normalizedTags.has(tag));
    const hasSolidarityTag = Array.from(TAG_SYNONYMS.solidarity).some((tag) => normalizedTags.has(tag));

    const requestedBadgeKeys: string[] = [];
    if (hasMuslimOwnedTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.muslim);
    if (hasPrayerTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.prayer);
    if (hasDonationsTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.donations);
    
    // For anonymous users, explicitly set both ID fields to null to satisfy RLS policy
    // IMPORTANT: We must use explicit null (not undefined) and ensure fields are always present
    const insertData: Record<string, unknown> = {
      provider_id: generatedProviderId,
      provider_name: formData.title,
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
      has_parking: hasParkingTag,
      solidarity_pricing: hasSolidarityTag,
      provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
      offers_ids: formData.offers_ids || [],
      needs_ids: formData.needs_ids || [],
      review_status: 'pending' as const, // Providers need review
      // Store recommender email for anonymous recommendations (with consent)
      recommender_email: isAnonymous && formData.userEmail ? formData.userEmail : null,
    };

    // CRITICAL: Always explicitly set these fields with null (not undefined)
    // The RLS policy requires them to be NULL for anonymous users
    // Using Object.assign to ensure they're always present in the object
    if (isAnonymous) {
      // Anonymous users: both must be explicitly null
      Object.assign(insertData, {
        user_created_id: null,
        provider_owner_id: null,
      });
    } else if (user?.id) {
      // Authenticated users
      Object.assign(insertData, {
        user_created_id: user.id,
        provider_owner_id: (isOwner && user.id) ? user.id : null,
      });
    } else {
      // Fallback: user is null but not anonymous (shouldn't happen, but be safe)
      Object.assign(insertData, {
        user_created_id: null,
        provider_owner_id: null,
      });
    }

    // Insert without SELECT to avoid SELECT policy blocking pending reviews
    const { error: providerError } = await supabase
      .from('providers')
      .insert([insertData]);

    if (providerError) {
      console.error('Error creating provider:', providerError);
      throw providerError;
    }

    if (requestedBadgeKeys.length > 0) {
      const { data: badgeTypes, error: badgeTypesError } = await supabase
        .from('badge_types')
        .select('id, badge_key')
        .in('badge_key', requestedBadgeKeys);

      let badgeInsertFailed = false;

      if (badgeTypesError) {
        badgeInsertFailed = true;
        console.error('Error fetching badge types for provider creation:', badgeTypesError);
      } else if (badgeTypes && badgeTypes.length > 0) {
        const badgeRows = badgeTypes.map((badgeType) => ({
          entity_id: generatedProviderId,
          entity_type: 'provider',
          badge_type_id: badgeType.id,
          trust_level: TrustLevel.SELF_DECLARED,
          confirmation_count: 0,
        }));

        const { error: providerBadgesError } = await supabase
          .from('provider_badges')
          .insert(badgeRows);

        if (providerBadgesError) {
          badgeInsertFailed = true;
          console.error('Error creating provider badges during provider creation:', providerBadgesError);
        }
      }

      if (badgeInsertFailed) {
        const fallbackBooleans: Record<string, boolean> = {};
        if (hasMuslimOwnedTag) fallbackBooleans.muslim_owned = true;
        if (hasPrayerTag) fallbackBooleans.has_prayer_space = true;
        if (hasDonationsTag) fallbackBooleans.accepts_donations = true;

        if (Object.keys(fallbackBooleans).length > 0) {
          const { error: fallbackError } = await supabase
            .from('providers')
            .update(fallbackBooleans)
            .eq('provider_id', generatedProviderId);

          if (fallbackError) {
            console.error('Error applying fallback provider booleans after badge insert failure:', fallbackError);
          }
        }
      }
    }

    // Create provider-community service relationships for all selected services
    if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
      for (const serviceId of formData.selectedCommunityServiceIds) {
        const { error: relationshipError } = await createProviderCommunityServiceRelationship(
          generatedProviderId,
          serviceId
        );

        if (relationshipError) {
          console.error('Error creating relationship:', relationshipError);
          // Don't throw here - the provider was created successfully
        }
      }
    }

    return { provider_id: generatedProviderId };
  }
}




