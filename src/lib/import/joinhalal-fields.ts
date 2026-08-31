/**
 * JoinHalal upsert field classification (Plan 052, updated Plan 055)
 *
 * Defines which provider fields are source-controlled (updated on conflict)
 * vs admin-controlled (preserved on conflict). This classification must match
 * the DO UPDATE SET clause in migration 064 (replaces 063).
 *
 * Plan 055: provider_description removed — column absent in production
 * (documented in migration 056). The RPC must not reference it.
 */

/** Fields updated by the RPC function on conflict (re-import refreshes these). */
export const SOURCE_CONTROLLED_FIELDS = [
  'provider_name',
  'category_id',
  'address_street',
  'address_zip',
  'address_city',
  'address_country',
  'contact_email',
  'contact_phone',
  'social_website',
  'social_instagram',
  'offer_ids',
  // Plan 089 M4: section fields are source-controlled (JoinHalal always sets these)
  'listing_type',
  'no_alcohol',
  'verification_method',
  'has_certificate',
] as const;

/** Fields preserved by the RPC function on conflict (admin/moderator state). */
export const ADMIN_CONTROLLED_FIELDS = [
  'review_status',
  'review_feedback',
  'provider_owner_id',
  'user_created_id',
  'provider_images',
  'show_address',
  'needs_ids',
] as const;
