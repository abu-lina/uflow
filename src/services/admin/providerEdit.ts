/**
 * Admin provider edit service
 * Handles admin/moderator updates to provider fields via service-role client.
 *
 * Write model decision: Uses service-role (getSupabaseAdmin) for consistency
 * with Plan 058's admin read path. The server boundary validates admin
 * authorization before any write, so bypassing RLS is controlled.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';

export interface AdminProviderEditData {
  providerName?: string;
  providerDescription?: string | null;
  categoryId?: string;
  listingType?: 'food' | 'business' | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialWebsite?: string | null;
  socialInstagram?: string | null;
  providerImages?: string | null;
  offersIds?: string[];
  needsIds?: string[];
  communityServiceIds?: string[];
}

/**
 * Update provider fields as admin/moderator.
 * Only includes fields that are explicitly provided in editData (partial update).
 */
export async function updateProviderFields(
  providerId: string,
  editData: AdminProviderEditData,
  _adminUserId: string
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();

  // Build update payload from only the provided fields
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (editData.providerName !== undefined) {
    updatePayload.provider_name = sanitizeTextInput(editData.providerName);
  }
  if (editData.providerDescription !== undefined) {
    updatePayload.provider_description = editData.providerDescription
      ? sanitizeTextInput(editData.providerDescription)
      : null;
  }
  if (editData.categoryId !== undefined) {
    updatePayload.category_id = editData.categoryId;
  }
  if (editData.listingType !== undefined) {
    updatePayload.listing_type = editData.listingType;
  }
  if (editData.addressStreet !== undefined) {
    updatePayload.address_street = editData.addressStreet
      ? sanitizeTextInput(editData.addressStreet)
      : null;
  }
  if (editData.addressZip !== undefined) {
    updatePayload.address_zip = editData.addressZip
      ? sanitizeTextInput(editData.addressZip)
      : null;
  }
  if (editData.addressCity !== undefined) {
    updatePayload.address_city = editData.addressCity
      ? sanitizeTextInput(editData.addressCity)
      : null;
  }
  if (editData.addressCountry !== undefined) {
    updatePayload.address_country = editData.addressCountry
      ? sanitizeTextInput(editData.addressCountry)
      : null;
  }
  if (editData.contactEmail !== undefined) {
    updatePayload.contact_email = editData.contactEmail
      ? sanitizeTextInput(editData.contactEmail)
      : null;
  }
  if (editData.contactPhone !== undefined) {
    updatePayload.contact_phone = editData.contactPhone
      ? sanitizeTextInput(editData.contactPhone)
      : null;
  }
  if (editData.socialWebsite !== undefined) {
    updatePayload.social_website = editData.socialWebsite
      ? sanitizeTextInput(editData.socialWebsite)
      : null;
  }
  if (editData.socialInstagram !== undefined) {
    updatePayload.social_instagram = editData.socialInstagram
      ? sanitizeTextInput(editData.socialInstagram)
      : null;
  }
  if (editData.providerImages !== undefined) {
    // providerImages is validated at the schema layer (Plan 060 M-1)
    updatePayload.provider_images = editData.providerImages
      ? sanitizeTextInput(editData.providerImages)
      : null;
  }

  if (editData.offersIds !== undefined) {
    const { error: clearOffersError } = await supabase
      .from('provider_offers')
      .delete()
      .eq('provider_id', providerId);

    if (clearOffersError) {
      throw new Error(`Failed to clear provider offers: ${clearOffersError.message}`);
    }

    if (editData.offersIds.length > 0) {
      const offerRows = editData.offersIds.map((offerId) => ({ provider_id: providerId, offer_id: offerId }));
      const { error: insertOffersError } = await supabase.from('provider_offers').insert(offerRows);
      if (insertOffersError) {
        throw new Error(`Failed to update provider offers: ${insertOffersError.message}`);
      }
    }
  }

  if (editData.needsIds !== undefined) {
    const { error: clearNeedsError } = await supabase
      .from('provider_needs')
      .delete()
      .eq('provider_id', providerId);

    if (clearNeedsError) {
      throw new Error(`Failed to clear provider needs: ${clearNeedsError.message}`);
    }

    if (editData.needsIds.length > 0) {
      const needRows = editData.needsIds.map((needId) => ({ provider_id: providerId, need_id: needId }));
      const { error: insertNeedsError } = await supabase.from('provider_needs').insert(needRows);
      if (insertNeedsError) {
        throw new Error(`Failed to update provider needs: ${insertNeedsError.message}`);
      }
    }
  }

  // Update community service relationships if provided
  if (editData.communityServiceIds !== undefined) {
    // Delete existing relationships
    const { error: deleteError } = await supabase
      .from('provider_community_services')
      .delete()
      .eq('provider_id', providerId);

    if (deleteError) {
      throw new Error(`Failed to clear community services: ${deleteError.message}`);
    }

    // Insert new relationships
    if (editData.communityServiceIds.length > 0) {
      const rows = editData.communityServiceIds.map(serviceId => ({
        provider_id: providerId,
        community_service_id: serviceId,
      }));
      const { error: insertError } = await supabase
        .from('provider_community_services')
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to update community services: ${insertError.message}`);
      }
    }
  }

  const { data: rows, error } = await supabase
    .from('providers')
    .update(updatePayload)
    .eq('provider_id', providerId)
    .select();

  if (error) {
    throw new Error(`Failed to update provider: ${error.message}`);
  }

  const data = (rows as Record<string, unknown>[] | null)?.[0] ?? null;

  if (!data) {
    throw new Error('Provider not found');
  }

  return data;
}
