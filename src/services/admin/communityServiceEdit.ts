/**
 * Admin community service edit service
 * Handles admin/moderator updates to community service fields via service-role client.
 *
 * Plan 083 — M1
 *
 * Write model decision: Uses service-role (getSupabaseAdmin) for consistency
 * with Plan 061's admin read path. The server boundary validates admin
 * authorization before any write, so bypassing RLS is controlled.
 *
 * Image format: community_service_images is a Postgres TEXT[] column.
 * The API accepts string[] directly — no JSON wrapping needed here.
 * The ProviderEditForm adapter (M2) handles conversions between TEXT[] and
 * the JSON string format the form expects.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';

export interface AdminCommunityServiceEditData {
  serviceName?: string;
  serviceDescription?: string | null;
  categoryId?: string;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialWebsite?: string | null;
  socialInstagram?: string | null;
  communityServiceImages?: string[] | null;
  offersIds?: string[];
  needsIds?: string[];
}

/**
 * Get a single community service by ID for admin editing.
 * Uses service-role to bypass RLS (can load non-approved services).
 */
export async function getCommunityServiceForAdmin(
  communityServiceId: string
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('community_service_id', communityServiceId);

  if (error) {
    throw new Error(`Failed to fetch community service: ${error.message}`);
  }

  return (rows as Record<string, unknown>[] | null)?.[0] ?? null;
}

/**
 * Update community service fields as admin/moderator.
 * Only includes fields that are explicitly provided in editData (partial update).
 */
export async function updateCommunityServiceFields(
  communityServiceId: string,
  editData: AdminCommunityServiceEditData,
  _adminUserId: string
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (editData.serviceName !== undefined) {
    updatePayload.community_service_name = sanitizeTextInput(editData.serviceName);
  }
  if (editData.serviceDescription !== undefined) {
    updatePayload.community_service_description = editData.serviceDescription
      ? sanitizeTextInput(editData.serviceDescription)
      : null;
  }
  if (editData.categoryId !== undefined) {
    updatePayload.category_id = editData.categoryId;
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
  if (editData.communityServiceImages !== undefined) {
    // Accept as TEXT[] (native Postgres array) — no JSON wrapping
    updatePayload.community_service_images = editData.communityServiceImages ?? null;
  }

  if (editData.offersIds !== undefined) {
    const { error: clearOffersError } = await supabase
      .from('community_service_offers')
      .delete()
      .eq('community_service_id', communityServiceId);

    if (clearOffersError) {
      throw new Error(`Failed to clear community service offers: ${clearOffersError.message}`);
    }

    if (editData.offersIds.length > 0) {
      const offerRows = editData.offersIds.map((offerId) => ({
        community_service_id: communityServiceId,
        offer_id: offerId,
      }));

      const { error: insertOffersError } = await supabase
        .from('community_service_offers')
        .insert(offerRows);

      if (insertOffersError) {
        throw new Error(`Failed to update community service offers: ${insertOffersError.message}`);
      }
    }
  }

  if (editData.needsIds !== undefined) {
    const { error: clearNeedsError } = await supabase
      .from('community_service_needs')
      .delete()
      .eq('community_service_id', communityServiceId);

    if (clearNeedsError) {
      throw new Error(`Failed to clear community service needs: ${clearNeedsError.message}`);
    }

    if (editData.needsIds.length > 0) {
      const needRows = editData.needsIds.map((needId) => ({
        community_service_id: communityServiceId,
        need_id: needId,
      }));

      const { error: insertNeedsError } = await supabase
        .from('community_service_needs')
        .insert(needRows);

      if (insertNeedsError) {
        throw new Error(`Failed to update community service needs: ${insertNeedsError.message}`);
      }
    }
  }

  const { data: rows, error } = await supabase
    .from('community_services')
    .update(updatePayload)
    .eq('community_service_id', communityServiceId)
    .select();

  if (error) {
    throw new Error(`Failed to update community service: ${error.message}`);
  }

  const data = (rows as Record<string, unknown>[] | null)?.[0] ?? null;

  if (!data) {
    throw new Error('Community service not found');
  }

  return data;
}

/**
 * Update community service review status with optional optimistic concurrency check.
 * When expectedUpdatedAt is provided, the update only succeeds if the service's
 * updated_at still matches, preventing silent overwrites by concurrent admins.
 */
export async function updateCommunityServiceReview(
  communityServiceId: string,
  reviewStatus: 'approved' | 'rejected' | 'needs_revision',
  reviewFeedback?: string | null,
  expectedUpdatedAt?: string
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();

  const updateData: {
    review_status: string;
    review_feedback?: string | null;
    updated_at: string;
  } = {
    review_status: reviewStatus,
    updated_at: new Date().toISOString(),
  };

  if (reviewFeedback !== undefined) {
    updateData.review_feedback = reviewFeedback ? sanitizeTextInput(reviewFeedback) : null;
  }

  let query = supabase
    .from('community_services')
    .update(updateData)
    .eq('community_service_id', communityServiceId);

  if (expectedUpdatedAt) {
    query = query.eq('updated_at', expectedUpdatedAt);
  }

  const { data: rows, error } = await query.select();

  if (error) {
    throw new Error(`Failed to update community service review: ${error.message}`);
  }

  const data = (rows as Record<string, unknown>[] | null)?.[0] ?? null;

  if (!data) {
    if (expectedUpdatedAt) {
      throw new Error('CONFLICT: Community service was modified by another reviewer. Please refresh and try again.');
    }
    throw new Error('Community service not found');
  }

  return data;
}
