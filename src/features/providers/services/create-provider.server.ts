import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ProviderFormData } from '@/providers/form-provider';
import { TrustLevel } from '@/types/badges';
import type { CreateProviderResult } from './mutations';

/** ProviderFormData minus File fields, plus already-uploaded public image URLs. */
export type CreateProviderPayload = Omit<ProviderFormData, 'images' | 'certificate_file'> & {
  imageUrls?: string[];
};

export interface CreateProviderActor {
  /** Resolved from the server-side session; the route rejects anonymous
   * requests, so this is always a real user id. */
  userId: string;
  /** true only when creationMode === 'owner'. */
  isOwner: boolean;
}

export interface CreateProviderServerInput {
  formData: CreateProviderPayload;
  actor: CreateProviderActor;
}

type AdminClient = SupabaseClient;

async function createPrimaryLocation(
  admin: AdminClient,
  providerId: string,
  formData: CreateProviderPayload,
): Promise<void> {
  const { error: locationError } = await admin.from('locations').insert([
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
  admin: AdminClient,
  table:
    'provider_offers' | 'provider_needs' | 'community_service_offers' | 'community_service_needs',
  entityColumn: 'provider_id',
  relationColumn: 'offer_id' | 'need_id',
  entityId: string,
  relationIds: string[],
): Promise<void> {
  const { error: deleteError } = await admin.from(table).delete().eq(entityColumn, entityId);

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

  const { error: insertError } = await admin.from(table).insert(rows);
  if (insertError) {
    throw insertError;
  }
}

async function resolveListingType(
  admin: AdminClient,
  categoryId: string,
): Promise<'food' | 'store' | 'ummah' | null> {
  if (!categoryId) return null;
  try {
    const { data } = await admin
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
 * Creates a provider or community service from form data. All writes go
 * through the service-role client: anon RLS policies only allow the providers
 * insert, so child-table writes (locations, provider_offers, provider_needs,
 * extension tables, badges) cannot run from the browser.
 *
 * After the providers insert succeeds, any failure of a required child write
 * deletes the provider row so a failed submission never leaves an orphan
 * pending provider with no location.
 *
 * @param input.formData - Form data with uploaded public image URLs
 * @param input.actor - Session-derived actor; ownership fields are never taken
 *   from the request body
 * @returns The created entity ID (provider_id or community_service_id)
 */
export async function createProviderOrServiceServer(
  input: CreateProviderServerInput,
): Promise<CreateProviderResult> {
  const { formData, actor } = input;
  const admin = getSupabaseAdmin();
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
  const uploadedUrls = formData.imageUrls ?? [];

  /**
   * Removes a provider row after a required child write failed. When the
   * delete itself fails, throws a loud error naming the orphan id so the row
   * can be cleaned up manually (the H4 regression contract).
   */
  const cleanupOrphan = async (providerId: string, cause: unknown) => {
    const causeMessage = (cause as { message?: string })?.message ?? String(cause);
    const { error: cleanupError } = await admin
      .from('providers')
      .delete()
      .eq('provider_id', providerId);
    if (cleanupError) {
      console.error('Failed to clean up provider after child write failure:', cleanupError);
      throw new Error(
        `Provider creation failed (${causeMessage}) and cleanup of orphaned provider '${providerId}' also failed (${cleanupError.message}). The provider row requires manual removal.`,
      );
    }
  };

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
      user_created_id: actor.userId,
    };

    const { error: serviceError } = await admin.from('providers').insert([insertData]);

    if (serviceError) {
      console.error('Error creating ummah provider:', serviceError);
      throw serviceError;
    }

    try {
      await Promise.all([
        syncEntityRelations(
          admin,
          'provider_offers',
          'provider_id',
          'offer_id',
          generatedServiceId,
          formData.offers_ids || [],
        ),
        syncEntityRelations(
          admin,
          'provider_needs',
          'provider_id',
          'need_id',
          generatedServiceId,
          formData.needs_ids || [],
        ),
        createPrimaryLocation(admin, generatedServiceId, formData),
      ]);
    } catch (childError) {
      await cleanupOrphan(generatedServiceId, childError);
      throw childError;
    }

    return { community_service_id: generatedServiceId };
  }

  // Create provider
  // Generate UUID client-side to avoid needing SELECT after INSERT
  // This bypasses the SELECT policy issue for pending reviews
  const generatedProviderId = crypto.randomUUID();

  // providers.listing_type is NOT NULL with no default; it must be resolved
  // before the insert, not after it.
  const resolvedListingType = await resolveListingType(admin, formData.category);
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

  const hasMuslimOwnedTag = Array.from(TAG_SYNONYMS.muslim).some((tag) => normalizedTags.has(tag));
  const hasPrayerTag = Array.from(TAG_SYNONYMS.prayer).some((tag) => normalizedTags.has(tag));
  const hasDonationsTag = Array.from(TAG_SYNONYMS.donations).some((tag) => normalizedTags.has(tag));
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

  // Ownership fields come from the session-derived actor, never the request
  // body: provider_owner_id is only set for owner submissions.
  Object.assign(insertData, {
    user_created_id: actor.userId,
    provider_owner_id: actor.isOwner ? actor.userId : null,
  });

  // Insert without SELECT to avoid SELECT policy blocking pending reviews
  const { error: providerError } = await admin.from('providers').insert([insertData]);

  if (providerError) {
    console.error('Error creating provider:', providerError);
    throw providerError;
  }

  try {
    await Promise.all([
      syncEntityRelations(
        admin,
        'provider_offers',
        'provider_id',
        'offer_id',
        generatedProviderId,
        formData.offers_ids || [],
      ),
      syncEntityRelations(
        admin,
        'provider_needs',
        'provider_id',
        'need_id',
        generatedProviderId,
        formData.needs_ids || [],
      ),
      createPrimaryLocation(admin, generatedProviderId, formData),
    ]);

    // Save halal attestation data to the extension table in the same logical
    // operation. The 228 halal gate treats a missing extension row as
    // all-attestations-missing, so a food/store provider without one can never
    // be approved — failure here must not be swallowed.
    if (resolvedListingType === 'food' || resolvedListingType === 'store') {
      const extTable = resolvedListingType === 'food' ? 'food_providers' : 'store_providers';
      // The certificate is uploaded client-side before submission;
      // certificate_url arrives as a public storage URL or empty.
      const certificateUrl = formData.certificate_url || null;
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
        // AC6.8: has_certificate is only written when a certificate URL
        // actually exists — a bare toggle must never produce a gold tier.
        has_certificate: certificateUrl != null,
        certificate_url: certificateUrl,
      };
      const { error: extError } = await admin
        .from(extTable)
        .upsert(extPayload, { onConflict: 'provider_id' });
      if (extError) {
        console.error('Error saving halal data:', extError);
        throw extError;
      }
    }
  } catch (childError) {
    // Required child write failed: remove the provider so it cannot sit
    // pending forever without a location or extension row.
    await cleanupOrphan(generatedProviderId, childError);
    throw childError;
  }

  if (requestedBadgeKeys.length > 0) {
    const { data: badgeTypes, error: badgeTypesError } = await admin
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

      const { error: providerBadgesError } = await admin.from('provider_badges').insert(badgeRows);

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
        const { error: fallbackError } = await admin
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
      // Insert directly with the admin client: the shared helper in
      // communityServices.ts uses the browser client, which has no session
      // server-side and would be RLS-blocked.
      const { error: relationshipError } = await admin.from('provider_engagements').insert({
        initiating_provider_id: generatedProviderId,
        engaged_provider_id: serviceId,
      });
      if (relationshipError) {
        console.error('Error creating provider engagement:', relationshipError);
        // non-fatal: the provider was created successfully
      }
    }
  }

  return { provider_id: generatedProviderId };
}
