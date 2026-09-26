import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createProviderCommunityServiceRelationship } from '@/services/communityServices';
import { TrustLevel } from '@/types/badges';

// Extended form data type (alias kept so callers with extra fields still typecheck)
type ExtendedProviderFormData = ProviderFormData;

export interface CreateProviderResult {
  provider_id?: string;
  community_service_id?: string;
}

async function createPrimaryLocation(
  providerId: string,
  formData: ExtendedProviderFormData,
): Promise<void> {
  const { error: locationError } = await supabase.from('locations').insert([
    {
      provider_id: providerId,
      location_name: null,
      address_street: formData.isOnlineBusiness ? null : formData.street || null,
      address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
      address_city: formData.isOnlineBusiness ? null : formData.city || null,
      address_country: formData.isOnlineBusiness ? null : formData.country || null,
      location_latitude: formData.isOnlineBusiness ? null : (formData.latitude ?? null),
      location_longitude: formData.isOnlineBusiness ? null : (formData.longitude ?? null),
      show_address: formData.isOnlineBusiness
        ? false
        : formData.showAddress !== undefined
          ? formData.showAddress
          : true,
      contact_phone: formData.phone || null,
      is_primary: true,
    },
  ]);

  if (locationError) {
    console.error('Error creating primary location:', locationError);
    throw locationError;
  }
}

async function syncEntityRelations(
  table:
    'provider_offers' | 'provider_needs' | 'community_service_offers' | 'community_service_needs',
  entityColumn: 'provider_id',
  relationColumn: 'offer_id' | 'need_id',
  entityId: string,
  relationIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase.from(table).delete().eq(entityColumn, entityId);

  if (deleteError) {
    throw deleteError;
  }

  if (relationIds.length === 0) {
    return;
  }

  const rows = relationIds.map((relationId) => ({
    [entityColumn]: entityId,
    [relationColumn]: relationId,
  }));

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) {
    throw insertError;
  }
}

async function resolveListingType(categoryId: string): Promise<'food' | 'store' | 'ummah' | null> {
  if (!categoryId) return null;
  try {
    const { data } = await supabase
      .from('categories')
      .select('applicable_section')
      .eq('category_id', categoryId)
      .single();
    if (data?.applicable_section && ['food', 'store', 'ummah'].includes(data.applicable_section)) {
      return data.applicable_section as 'food' | 'store' | 'ummah';
    }
  } catch {
    // Category lookup failed; caller treats this as unresolvable.
  }
  return null;
}

const TAG_SYNONYMS = {
  muslim: new Set(['muslim', 'muslim_owned', 'muslim-owned']),
  prayer: new Set([
    'gebet',
    'gebetsraum',
    'gebetsfreundlich',
    'prayer',
    'prayer_space',
    'prayer-friendly',
  ]),
  donations: new Set([
    'spenden',
    'spendenbereit',
    'makes_donations',
    'supports_sadaqah',
    'sadaqah',
  ]),
  parking: new Set(['parken', 'parking', 'has_parking']),
  solidarity: new Set(['solidaritaet', 'solidarity', 'economic_solidarity']),
} as const;

const FORM_TAG_TO_BADGE_KEY = {
  muslim: 'MUSLIM_OWNED',
  prayer: 'PRAYER_FRIENDLY',
  donations: 'SUPPORTS_SADAQAH',
  parking: 'HAS_PARKING',
  solidarity: 'ECONOMIC_SOLIDARITY',
} as const;

/**
 * Uploads entity images to the appropriate storage bucket and returns their
 * public URLs. Uploads are namespaced by user id (#415: submissions require a
 * logged-in user).
 */
async function uploadEntityImages(
  images: File[] | undefined,
  isCommunityService: boolean,
  userId: string | undefined,
): Promise<string[]> {
  if (!images || images.length === 0) {
    return [];
  }

  const bucketName = isCommunityService ? 'community-service-images' : 'provider-images';
  const folderName = isCommunityService ? 'community-services' : 'providers';
  const uploadedUrls: string[] = [];

  for (const imageFile of images) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId ?? 'unknown'}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}

/**
 * Creates a provider or community service from form data
 * Handles image uploads, entity creation, and relationships
 *
 * @param formData - The form data containing all provider/service information
 * @param user - The authenticated user; all submission flows require login (#415)
 * @param isRecommendationMode - Whether this is a recommendation or owner creation
 * @returns The created entity ID (provider_id or community_service_id)
 */
// AC5.9: a second submission with the same identity while one is in flight
// returns the in-flight promise instead of inserting a duplicate provider.
const inFlightSubmissions = new Map<string, Promise<CreateProviderResult>>();

export async function createProviderOrService(
  formData: ExtendedProviderFormData,
  user: User | null,
  isRecommendationMode: boolean,
): Promise<CreateProviderResult> {
  const dedupeKey = JSON.stringify([
    formData.title,
    formData.category,
    formData.city,
    user?.id ?? null,
    isRecommendationMode,
  ]);
  const existing = inFlightSubmissions.get(dedupeKey);
  if (existing) return existing;
  const submission = doCreateProviderOrService(formData, user).finally(() =>
    inFlightSubmissions.delete(dedupeKey),
  );
  inFlightSubmissions.set(dedupeKey, submission);
  return submission;
}

async function doCreateProviderOrService(
  formData: ExtendedProviderFormData,
  user: User | null,
): Promise<CreateProviderResult> {
  // #415: all submission flows require a logged-in user; the submitter is
  // identified by user_created_id (no email is collected from recommenders).
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
  const isOwner = formData.creationMode === 'owner';

  // Upload images if any exist
  const uploadedUrls = await uploadEntityImages(formData.images, isCommunityService, user?.id);

  if (isCommunityService) {
    // M-5a: community_services table dropped — ummah providers created in providers table
    const generatedServiceId = crypto.randomUUID();

    const insertData: Record<string, unknown> = {
      provider_id: generatedServiceId,
      listing_type: 'ummah',
      provider_name: formData.title,
      provider_description: formData.description || null,
      address_street: formData.isOnlineBusiness ? null : formData.street || null,
      address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
      address_city: formData.isOnlineBusiness ? null : formData.city || null,
      address_country: formData.isOnlineBusiness ? null : formData.country || null,
      show_address: formData.isOnlineBusiness
        ? false
        : formData.showAddress !== undefined
          ? formData.showAddress
          : true,
      category_id: formData.category || null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      provider_images: uploadedUrls.length > 0 ? uploadedUrls : null,
      review_status: 'pending' as const,
      user_created_id: user?.id ?? null,
    };

    const { error: serviceError } = await supabase.from('providers').insert([insertData]);

    if (serviceError) {
      console.error('Error creating ummah provider:', serviceError);
      throw serviceError;
    }

    await Promise.all([
      syncEntityRelations(
        'provider_offers',
        'provider_id',
        'offer_id',
        generatedServiceId,
        formData.offers_ids || [],
      ),
      syncEntityRelations(
        'provider_needs',
        'provider_id',
        'need_id',
        generatedServiceId,
        formData.needs_ids || [],
      ),
      createPrimaryLocation(generatedServiceId, formData),
    ]);

    return { community_service_id: generatedServiceId };
  } else {
    // Create provider
    // Generate UUID client-side to avoid needing SELECT after INSERT
    // This bypasses the SELECT policy issue for pending reviews
    const generatedProviderId = crypto.randomUUID();

    // providers.listing_type is NOT NULL with no default; it must be resolved
    // before the insert, not after it.
    const resolvedListingType = await resolveListingType(formData.category);
    if (!resolvedListingType) {
      throw new Error(
        `Unable to resolve listing_type for category '${formData.category}'; provider was not created.`,
      );
    }

    // Defence in depth (#415): food/store submissions must carry a deliberate
    // answer on all three halal attestations — true (yes), false (no), or
    // explicit null ("not sure"); undefined means the question was never
    // answered. Ummah/community-service submissions have no halal questions
    // and are exempt.
    if (
      (resolvedListingType === 'food' || resolvedListingType === 'store') &&
      [formData.no_alcohol, formData.no_pork, formData.no_gambling].some(
        (answer) => answer === undefined,
      )
    ) {
      throw new Error(
        'Halal attestation required: all three questions must be answered (yes, no, or not sure).',
      );
    }

    const normalizedTags = new Set(
      (formData.tags || []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
    );

    const hasMuslimOwnedTag = Array.from(TAG_SYNONYMS.muslim).some((tag) =>
      normalizedTags.has(tag),
    );
    const hasPrayerTag = Array.from(TAG_SYNONYMS.prayer).some((tag) => normalizedTags.has(tag));
    const hasDonationsTag = Array.from(TAG_SYNONYMS.donations).some((tag) =>
      normalizedTags.has(tag),
    );
    const hasParkingTag = Array.from(TAG_SYNONYMS.parking).some((tag) => normalizedTags.has(tag));
    const hasSolidarityTag = Array.from(TAG_SYNONYMS.solidarity).some((tag) =>
      normalizedTags.has(tag),
    );

    const requestedBadgeKeys: string[] = [];
    if (hasMuslimOwnedTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.muslim);
    if (hasPrayerTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.prayer);
    if (hasDonationsTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.donations);
    if (hasParkingTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.parking);
    if (hasSolidarityTag) requestedBadgeKeys.push(FORM_TAG_TO_BADGE_KEY.solidarity);

    const insertData: Record<string, unknown> = {
      provider_id: generatedProviderId,
      listing_type: resolvedListingType,
      provider_name: formData.title,
      // If online business, all address fields are null
      address_street: formData.isOnlineBusiness ? null : formData.street || null,
      address_zip: formData.isOnlineBusiness ? null : formData.zip || null,
      address_city: formData.isOnlineBusiness ? null : formData.city || null,
      address_country: formData.isOnlineBusiness ? null : formData.country || null,
      show_address: formData.isOnlineBusiness
        ? false
        : formData.showAddress !== undefined
          ? formData.showAddress
          : true,
      category_id: formData.category || null,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
      review_status: 'pending' as const, // Providers need review
    };

    // The submitter is always identified by user_created_id; provider_owner_id
    // is only set for owner submissions.
    Object.assign(insertData, {
      user_created_id: user?.id ?? null,
      provider_owner_id: isOwner && user?.id ? user.id : null,
    });

    // Insert without SELECT to avoid SELECT policy blocking pending reviews
    const { error: providerError } = await supabase.from('providers').insert([insertData]);

    if (providerError) {
      console.error('Error creating provider:', providerError);
      throw providerError;
    }

    await Promise.all([
      syncEntityRelations(
        'provider_offers',
        'provider_id',
        'offer_id',
        generatedProviderId,
        formData.offers_ids || [],
      ),
      syncEntityRelations(
        'provider_needs',
        'provider_id',
        'need_id',
        generatedProviderId,
        formData.needs_ids || [],
      ),
      createPrimaryLocation(generatedProviderId, formData),
    ]);

    // Save halal attestation data to the extension table in the same logical
    // operation. The 228 halal gate treats a missing extension row as
    // all-attestations-missing, so a food/store provider without one can never
    // be approved — failure here must not be swallowed.
    if (resolvedListingType === 'food' || resolvedListingType === 'store') {
      const extTable = resolvedListingType === 'food' ? 'food_providers' : 'store_providers';
      const extPayload: Record<string, unknown> = {
        provider_id: generatedProviderId,
        // Tri-state (#415): true=yes, false=submitter said no, null=not sure.
        // NULL must survive so reviewers can triage "no" vs "unknown".
        no_alcohol: formData.no_alcohol ?? null,
        no_pork: formData.no_pork ?? null,
        no_gambling: formData.no_gambling ?? null,
        // verification_method is TEXT NOT NULL DEFAULT 'online' with
        // CHECK (... IN ('online','onsite')) — the 'online' fallback is a
        // schema default and carries no verification claim (computeSealTier
        // requires a truthy attestation before awarding a tier anyway).
        verification_method: formData.verification_method || 'online',
        has_certificate: formData.has_certificate || false,
        certificate_url: formData.certificate_url || null,
      };
      const { error: extError } = await supabase
        .from(extTable)
        .upsert(extPayload, { onConflict: 'provider_id' });
      if (extError) {
        console.error('Error saving halal data:', extError);
        // Best-effort compensation: remove the provider so it cannot sit
        // pending forever without an approvable extension row. The delete is
        // RLS-gated on provider_owner_id; for recommendations that is null,
        // so it fails for exactly the case it exists for. The returned error
        // must be surfaced (supabase returns errors, it does not throw) and
        // the orphan id included so the row can be cleaned up manually.
        const { error: cleanupError } = await supabase
          .from('providers')
          .delete()
          .eq('provider_id', generatedProviderId);
        if (cleanupError) {
          console.error('Failed to clean up provider after extension write failure:', cleanupError);
          throw new Error(
            `Halal data save failed (${extError.message}) and cleanup of orphaned provider '${generatedProviderId}' also failed (${cleanupError.message}). The provider row requires manual removal.`,
          );
        }
        throw extError;
      }
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
          provider_id: generatedProviderId,
          community_service_id: null,
          badge_type_id: badgeType.id,
          trust_level: TrustLevel.SELF_DECLARED,
          confirmation_count: 0,
        }));

        const { error: providerBadgesError } = await supabase
          .from('provider_badges')
          .insert(badgeRows);

        if (providerBadgesError) {
          badgeInsertFailed = true;
          console.error(
            'Error creating provider badges during provider creation:',
            providerBadgesError,
          );
        }
      }

      if (badgeInsertFailed) {
        const fallbackBooleans: Record<string, boolean> = {};
        if (hasMuslimOwnedTag) fallbackBooleans.muslim_owned = true;
        if (hasPrayerTag) fallbackBooleans.has_prayer_space = true;
        if (hasDonationsTag) fallbackBooleans.makes_donations = true;
        if (hasParkingTag) fallbackBooleans.has_parking = true;
        if (hasSolidarityTag) fallbackBooleans.economic_solidarity = true;

        if (Object.keys(fallbackBooleans).length > 0) {
          const { error: fallbackError } = await supabase
            .from('providers')
            .update(fallbackBooleans)
            .eq('provider_id', generatedProviderId);

          if (fallbackError) {
            console.error(
              'Error applying fallback provider booleans after badge insert failure:',
              fallbackError,
            );
          }
        }
      }
    }

    // Create provider-community service relationships for all selected services
    if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
      for (const serviceId of formData.selectedCommunityServiceIds) {
        const { error: relationshipError } = await createProviderCommunityServiceRelationship(
          generatedProviderId,
          serviceId,
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
