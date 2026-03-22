/**
 * Contract test: JoinHalal upsert field classification (Plan 052 — QA re-fix)
 *
 * Verifies that source-controlled and admin-controlled field sets are disjoint
 * and together cover all import-relevant provider fields. This is the TypeScript
 * counterpart of the SQL RPC function's DO UPDATE SET allowlist.
 */
import { describe, it, expect } from 'vitest';
import {
  SOURCE_CONTROLLED_FIELDS,
  ADMIN_CONTROLLED_FIELDS,
} from '@/lib/import/joinhalal-fields';

describe('JoinHalal upsert field classification (Plan 052)', () => {
  it('source-controlled and admin-controlled field sets are disjoint', () => {
    const sourceFields = [...SOURCE_CONTROLLED_FIELDS] as string[];
    const adminFields = [...ADMIN_CONTROLLED_FIELDS] as string[];
    const adminSet = new Set(adminFields);
    const intersection = sourceFields.filter((f) => adminSet.has(f));
    expect(intersection).toEqual([]);
  });

  it('all import-relevant provider fields are classified', () => {
    const allClassified = new Set<string>([
      ...SOURCE_CONTROLLED_FIELDS,
      ...ADMIN_CONTROLLED_FIELDS,
    ]);
    // Every field in the import payload excluding conflict-key columns
    // (import_source, import_source_id) which are neither source- nor admin-controlled
    const importPayloadFields = [
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
      'review_status',
      'user_created_id',
      'provider_owner_id',
      'show_address',
      'needs_ids',
      'barakah_effects',
    ];
    for (const field of importPayloadFields) {
      expect(
        allClassified.has(field),
        `Field '${field}' is not classified as source-controlled or admin-controlled`
      ).toBe(true);
    }
  });

  it('source-controlled fields match the RPC DO UPDATE SET allowlist', () => {
    // These are the ONLY fields the RPC function updates on conflict.
    // If this list changes, the SQL migration must be updated too.
    const sourceFields = [...SOURCE_CONTROLLED_FIELDS] as string[];
    expect(sourceFields.sort()).toEqual(
      [
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
      ].sort()
    );
  });

  it('admin-controlled fields are never updated on conflict', () => {
    // These fields must be preserved when a conflict update occurs.
    // Adding a field here without updating the SQL function is a safety check.
    const adminFields = [...ADMIN_CONTROLLED_FIELDS] as string[];
    expect(adminFields.sort()).toEqual(
      [
        'review_status',
        'review_feedback',
        'provider_owner_id',
        'user_created_id',
        'provider_images',
        'show_address',
        'needs_ids',
        'barakah_effects',
      ].sort()
    );
  });
});
