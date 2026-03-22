/**
 * JoinHalal upsert field classification (Plan 052)
 *
 * Defines which provider fields are source-controlled (updated on conflict)
 * vs admin-controlled (preserved on conflict). This classification must match
 * the DO UPDATE SET clause in migration 063_upsert_joinhalal_provider_rpc.sql.
 */

/** Fields updated by the RPC function on conflict (re-import refreshes these). */
export const SOURCE_CONTROLLED_FIELDS = [
  'provider_name',
  'provider_description',
  'category_id',
  'address_street',
  'address_zip',
  'address_city',
  'address_country',
  'contact_email',
  'contact_phone',
  'social_website',
  'social_instagram',
  'offers_ids',
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
  'barakah_effects',
] as const;
