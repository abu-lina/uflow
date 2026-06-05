/**
 * Admin provider edit service
 * Handles admin/moderator updates to provider fields via service-role client.
 *
 * Write model decision: Uses service-role (getSupabaseAdmin) for consistency
 * with Plan 058's admin read path. The server boundary validates admin
 * authorization before any write, so bypassing RLS is controlled.
 *
 * Plan 145: All multi-table writes are wrapped in the admin_update_provider
 * RPC function for atomic transaction safety.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface AdminProviderEditData {
  providerName?: string;
  providerDescription?: string | null;
  categoryId?: string;
  listingType?: 'food' | 'store' | 'ummah' | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialWebsite?: string | null;
  socialInstagram?: string | null;
  providerImages?: string | null;
  communityServiceIds?: string[];
  openingHours?: Record<string, unknown> | null;
  verificationMethod?: 'online' | 'onsite' | null;
  hasCertificate?: boolean;
  certificateUrl?: string | null;
  noAlcohol?: boolean;
  noPork?: boolean;
  noGambling?: boolean;
  muslimOwned?: boolean;
  hasPrayerSpace?: boolean;
  familyFriendly?: boolean;
  womenFriendly?: boolean;
  childrenFriendly?: boolean;
  makesDonations?: boolean;
  hasParking?: boolean;
  economicSolidarity?: boolean;
  menuItems?: Array<{
    name_de: string;
    name_en?: string;
    description_de?: string;
    price_cents: number;
    category?: string;
    sort_order: number;
    is_available: boolean;
  }>;
  deliveryLinks?: Array<{
    platform: 'wolt' | 'lieferando' | 'ubereats';
    platform_url: string;
    platform_slug?: string;
    is_active: boolean;
  }>;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
}

export function buildBasicFieldsPayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.providerName !== undefined) payload.provider_name = data.providerName;
  if (data.providerDescription !== undefined) payload.provider_description = data.providerDescription;
  if (data.categoryId !== undefined) payload.category_id = data.categoryId;
  if (data.listingType !== undefined) payload.listing_type = data.listingType;
  if (data.addressStreet !== undefined) payload.address_street = data.addressStreet;
  if (data.addressZip !== undefined) payload.address_zip = data.addressZip;
  if (data.addressCity !== undefined) payload.address_city = data.addressCity;
  if (data.addressCountry !== undefined) payload.address_country = data.addressCountry;
  if (data.contactEmail !== undefined) payload.contact_email = data.contactEmail;
  if (data.contactPhone !== undefined) payload.contact_phone = data.contactPhone;
  if (data.socialWebsite !== undefined) payload.social_website = data.socialWebsite;
  if (data.socialInstagram !== undefined) payload.social_instagram = data.socialInstagram;
  if (data.providerImages !== undefined) payload.provider_images = data.providerImages;
  if (data.openingHours !== undefined) payload.opening_hours = data.openingHours;
  if (data.reviewStatus !== undefined) payload.review_status = data.reviewStatus;

  return payload;
}

export function buildExtensionFieldsPayload(
  data: Partial<AdminProviderEditData>,
  listingType?: 'food' | 'store' | string | null
): Record<string, unknown> {
  const hasExtensionFields =
    data.verificationMethod !== undefined ||
    data.hasCertificate !== undefined ||
    data.certificateUrl !== undefined ||
    data.noAlcohol !== undefined ||
    data.noPork !== undefined ||
    data.noGambling !== undefined;

  if (!hasExtensionFields) return {};

  const ext: Record<string, unknown> = {};

  if (data.verificationMethod !== undefined) ext.verification_method = data.verificationMethod;
  if (data.hasCertificate !== undefined) ext.has_certificate = data.hasCertificate;
  if (data.certificateUrl !== undefined) ext.certificate_url = data.certificateUrl;
  if (data.noAlcohol !== undefined) ext.no_alcohol = data.noAlcohol;
  if (data.noPork !== undefined) ext.no_pork = data.noPork;
  if (data.noGambling !== undefined) ext.no_gambling = data.noGambling;

  if (listingType === 'food') {
    return { food_providers: ext };
  }
  if (listingType === 'store') {
    // Store only has no_gambling of the three booleans
    const storeExt: Record<string, unknown> = { ...ext };
    delete storeExt.no_alcohol;
    delete storeExt.no_pork;
    return { store_providers: storeExt };
  }

  return {};
}

export function buildAmenitiesPayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.muslimOwned !== undefined) payload.muslim_owned = data.muslimOwned;
  if (data.hasPrayerSpace !== undefined) payload.has_prayer_space = data.hasPrayerSpace;
  if (data.familyFriendly !== undefined) payload.family_friendly = data.familyFriendly;
  if (data.womenFriendly !== undefined) payload.women_friendly = data.womenFriendly;
  if (data.childrenFriendly !== undefined) payload.children_friendly = data.childrenFriendly;
  if (data.makesDonations !== undefined) payload.makes_donations = data.makesDonations;
  if (data.hasParking !== undefined) payload.has_parking = data.hasParking;
  if (data.economicSolidarity !== undefined) payload.economic_solidarity = data.economicSolidarity;

  return payload;
}

export function buildMenuPayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  if (data.menuItems === undefined) return {};
  return { menu_items: data.menuItems };
}

export function buildDeliveryLinksPayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  if (data.deliveryLinks === undefined) return {};
  return { delivery_links: data.deliveryLinks };
}

export function buildCommunityServicePayload(data: Partial<AdminProviderEditData>): Record<string, unknown> {
  if (data.communityServiceIds === undefined) return {};
  return { community_service_ids: data.communityServiceIds };
}

function buildRpcPayload(
  editData: AdminProviderEditData,
  listingType?: 'food' | 'store' | string | null
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const basicFields = buildBasicFieldsPayload(editData);
  if (Object.keys(basicFields).length > 0) {
    payload.providers = basicFields;
  }

  const amenities = buildAmenitiesPayload(editData);
  if (Object.keys(amenities).length > 0) {
    payload.providers = { ...(payload.providers as Record<string, unknown> || {}), ...amenities };
  }

  const extensions = buildExtensionFieldsPayload(editData, listingType);
  if (Object.keys(extensions).length > 0) {
    Object.assign(payload, extensions);
  }

  const menu = buildMenuPayload(editData);
  if (Object.keys(menu).length > 0) {
    Object.assign(payload, menu);
  }

  const delivery = buildDeliveryLinksPayload(editData);
  if (Object.keys(delivery).length > 0) {
    Object.assign(payload, delivery);
  }

  const communityService = buildCommunityServicePayload(editData);
  if (Object.keys(communityService).length > 0) {
    Object.assign(payload, communityService);
  }

  return payload;
}

/**
 * Update provider fields as admin/moderator.
 * Uses the admin_update_provider RPC function for atomic multi-table writes.
 */
export async function updateProviderFields(
  providerId: string,
  editData: AdminProviderEditData,
  _adminUserId: string
): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();

  const rpcPayload = buildRpcPayload(editData, editData.listingType);

  const { data, error } = await supabase
    .rpc('admin_update_provider', {
      p_provider_id: providerId,
      p_data: rpcPayload,
    });

  if (error) {
    throw new Error(`Failed to update provider: ${error.message}`);
  }

  if (!data) {
    throw new Error('Provider not found');
  }

  return data as Record<string, unknown>;
}
