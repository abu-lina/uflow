/**
 * Admin community service service
 * Business logic for admin community service operations.
 * Uses service-role to bypass RLS (can load non-approved community services).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';
import type { CommunityService } from '@/services/communityServices';

/**
 * Fetch a community service by ID for admin editing.
 * Uses service-role to bypass RLS (can load non-approved community services).
 */
export async function getCommunityServiceForAdmin(communityServiceId: string): Promise<CommunityService | null> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('community_service_id', communityServiceId);

  if (error) {
    throw new Error(`Failed to fetch community service: ${error.message}`);
  }

  return (rows as CommunityService[] | null)?.[0] ?? null;
}

export interface AdminCommunityServiceEditData {
  communityServiceName?: string;
  communityServiceDescription?: string | null;
  categoryId?: string;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialWebsite?: string | null;
  socialInstagram?: string | null;
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

  if (editData.communityServiceName !== undefined) {
    updatePayload.community_service_name = sanitizeTextInput(editData.communityServiceName);
  }
  if (editData.communityServiceDescription !== undefined) {
    updatePayload.community_service_description = editData.communityServiceDescription
      ? sanitizeTextInput(editData.communityServiceDescription)
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

  const { data, error } = await supabase
    .from('community_services')
    .update(updatePayload)
    .eq('community_service_id', communityServiceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update community service: ${error.message}`);
  }

  return data as Record<string, unknown>;
}
