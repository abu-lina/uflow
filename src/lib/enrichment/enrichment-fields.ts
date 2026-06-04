/**
 * Enrichment field classification — Plan 065, Milestone 2.
 *
 * Determines which provider fields are admin-controlled (Plan 052) vs
 * source-enrichable. Used by the enrichment pipeline to prevent proposals
 * for admin-controlled fields.
 *
 * ESM-compatible: no Node-specific APIs (Arch Finding A-1, Option A).
 */

/**
 * Fields that are admin-controlled per Plan 052.
 * The enrichment pipeline MUST NOT create candidates for these fields.
 */
export const ADMIN_CONTROLLED_FIELDS: ReadonlyArray<string> = [
  'review_status',
  'review_feedback',
  'provider_owner_id',
  'created_at',
  'provider_images',
  'needs_ids',
  'show_address',
] as const;

/**
 * Fields that may be proposed by the enrichment pipeline.
 * These are source-data fields from the providers table.
 */
export const SOURCE_ENRICHABLE_FIELDS: ReadonlyArray<string> = [
  'offers_ids',
  'contact_phone',
  'social_website',
  'social_instagram',
  'address_street',
  'address_zip',
  'address_city',
  'address_country',
  'opening_hours',
  'no_alcohol',
] as const;

const adminFieldSet = new Set(ADMIN_CONTROLLED_FIELDS);
const sourceFieldSet = new Set(SOURCE_ENRICHABLE_FIELDS);

/**
 * Returns true if the given field name is admin-controlled.
 * Unknown fields default to admin-controlled (safe default — prevents accidental overwrites).
 */
export function isAdminField(fieldName: string): boolean {
  if (sourceFieldSet.has(fieldName)) return false;
  if (adminFieldSet.has(fieldName)) return true;
  // Unknown fields are treated as admin-controlled (safe default)
  return true;
}
