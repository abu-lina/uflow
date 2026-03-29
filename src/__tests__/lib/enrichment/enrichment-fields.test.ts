/**
 * Tests for src/lib/enrichment/enrichment-fields.ts
 *
 * TDD: Tests written BEFORE implementation.
 * Plan 065 — Milestone 2: Field classification and conflict detection.
 */

import { describe, expect, it } from 'vitest';
import {
  isAdminField,
  ADMIN_CONTROLLED_FIELDS,
  SOURCE_ENRICHABLE_FIELDS,
} from '@/lib/enrichment/enrichment-fields';

describe('isAdminField', () => {
  it('returns true for Plan 052 admin-controlled fields', () => {
    const adminFields = [
      'review_status',
      'review_feedback',
      'provider_owner_id',
      'created_at',
      'provider_images',
      'barakah_effects',
      'needs_ids',
      'show_address',
    ];
    for (const field of adminFields) {
      expect(isAdminField(field)).toBe(true);
    }
  });

  it('returns false for source-enrichable fields', () => {
    const sourceFields = [
      'offers_ids',
      'contact_phone',
      'social_website',
      'social_instagram',
      'address_street',
      'address_zip',
      'address_city',
      'address_country',
    ];
    for (const field of sourceFields) {
      expect(isAdminField(field)).toBe(false);
    }
  });

  it('returns true for unknown fields (safe default)', () => {
    expect(isAdminField('some_unknown_field')).toBe(true);
  });
});

describe('ADMIN_CONTROLLED_FIELDS', () => {
  it('includes all Plan 052 admin-controlled fields', () => {
    expect(ADMIN_CONTROLLED_FIELDS).toContain('review_status');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('review_feedback');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('provider_owner_id');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('created_at');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('provider_images');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('barakah_effects');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('needs_ids');
    expect(ADMIN_CONTROLLED_FIELDS).toContain('show_address');
  });
});

describe('SOURCE_ENRICHABLE_FIELDS', () => {
  it('includes offers_ids and contact fields', () => {
    expect(SOURCE_ENRICHABLE_FIELDS).toContain('offers_ids');
    expect(SOURCE_ENRICHABLE_FIELDS).toContain('contact_phone');
    expect(SOURCE_ENRICHABLE_FIELDS).toContain('social_website');
    expect(SOURCE_ENRICHABLE_FIELDS).toContain('social_instagram');
  });

  it('does not include any admin-controlled field', () => {
    for (const field of SOURCE_ENRICHABLE_FIELDS) {
      expect(isAdminField(field)).toBe(false);
    }
  });
});
