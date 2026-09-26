// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 chunk C2 — tri-state halal attestation + submit policies
 *
 * Validates:
 *   AC6.1  the same halal questions exist in both flows via one shared
 *          component (HalalAttestationFields)
 *   AC6.2  yes/no/not sure map to true/false/NULL in the extension row write
 *   AC6.3  the 228 gate blocks approval for both false and NULL while
 *          distinguishing them for admin triage
 *   RLS    self-read widened to user_created_id; client inserts constrained
 *          to review_status = 'pending' (source-scan: RLS cannot be
 *          exercised without a live DB)
 *   AC6.4  the tier text leak is removed from create/halal
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

// ── Mocks for createProviderOrService ────────────────────────────────────────

const mockProviderInsert = vi.fn();
const mockProviderDeleteEq = vi.fn();
const mockCategorySingle = vi.fn();
const mockFoodExtUpsert = vi.fn();
const mockStoreExtUpsert = vi.fn();
const mockLocationInsert = vi.fn();
const mockRelationDeleteEq = vi.fn();
const mockRelationInsert = vi.fn();
const mockBadgeTypeIn = vi.fn();
const mockBadgeInsert = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/x.png' } })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => mockProviderInsert(...args),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: () => ({ eq: (...args: unknown[]) => mockProviderDeleteEq(...args) }),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({ eq: () => ({ single: () => mockCategorySingle() }) }),
        };
      }
      if (table === 'food_providers') {
        return { upsert: (...args: unknown[]) => mockFoodExtUpsert(...args) };
      }
      if (table === 'store_providers') {
        return { upsert: (...args: unknown[]) => mockStoreExtUpsert(...args) };
      }
      if (table === 'locations') {
        return { insert: (...args: unknown[]) => mockLocationInsert(...args) };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: (...args: unknown[]) => mockRelationDeleteEq(...args) }),
          insert: (...args: unknown[]) => mockRelationInsert(...args),
        };
      }
      if (table === 'badge_types') {
        return { select: () => ({ in: (...args: unknown[]) => mockBadgeTypeIn(...args) }) };
      }
      if (table === 'provider_badges') {
        return { insert: (...args: unknown[]) => mockBadgeInsert(...args) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
  },
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Mocks for halal-gate ─────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => mockAdminFrom(table) }),
}));

// ── Mocks for HalalAttestationFields ─────────────────────────────────────────

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { createProviderOrService } from '@/features/providers/services/mutations';
import { checkHalalAttestation } from '@/services/admin/halal-gate';
import { buildExtensionFieldsPayload } from '@/services/admin/providerEdit';
import { computeHalalStars } from '@/utils/sectionBadges';
import { HalalAttestationFields } from '@/components/shared/HalalAttestationFields';

const FOOD_CATEGORY = 'food-cat-1';

const baseFormData: ProviderFormData = {
  creationMode: 'owner',
  entityType: 'provider',
  title: 'Test Restaurant',
  category: FOOD_CATEGORY,
  description: '',
  isOnlineBusiness: false,
  street: 'Main 1',
  zip: '12345',
  city: 'Berlin',
  country: 'DE',
  latitude: null,
  longitude: null,
  showAddress: true,
  website: '',
  instagram: '',
  phone: '',
  email: '',
  offers_ids: [],
  needs_ids: [],
  images: [],
  selectedCommunityServiceIds: [],
  tags: [],
  socialCategory: '',
  socialTitle: '',
  socialDescription: '',
  no_alcohol: true,
  no_pork: true,
  no_gambling: true,
  verification_method: 'online',
  has_certificate: false,
  certificate_file: null,
  certificate_url: '',
};

describe('C2: tri-state attestation round-trip (AC6.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderInsert.mockResolvedValue({ error: null });
    mockProviderDeleteEq.mockResolvedValue({ error: null });
    mockCategorySingle.mockResolvedValue({ data: { applicable_section: 'food' }, error: null });
    mockFoodExtUpsert.mockResolvedValue({ error: null });
    mockStoreExtUpsert.mockResolvedValue({ error: null });
    mockLocationInsert.mockResolvedValue({ error: null });
    mockRelationDeleteEq.mockResolvedValue({ error: null });
    mockRelationInsert.mockResolvedValue({ error: null });
    mockBadgeTypeIn.mockResolvedValue({ data: [], error: null });
    mockBadgeInsert.mockResolvedValue({ error: null });
  });

  it.each([
    [{ no_alcohol: true, no_pork: false, no_gambling: null }],
    [{ no_alcohol: null, no_pork: null, no_gambling: null }],
    [{ no_alcohol: false, no_pork: false, no_gambling: false }],
  ])('writes extension row preserving true/false/NULL: %j', async (atts) => {
    const user = { id: 'user-1' } as User;
    await createProviderOrService({ ...baseFormData, ...atts }, user, false);

    expect(mockFoodExtUpsert).toHaveBeenCalledTimes(1);
    const ext = mockFoodExtUpsert.mock.calls[0][0];
    expect(ext.no_alcohol).toBe(atts.no_alcohol);
    expect(ext.no_pork).toBe(atts.no_pork);
    expect(ext.no_gambling).toBe(atts.no_gambling);
  });

  it('recommend submit preserves NULL (not sure) instead of coercing to false', async () => {
    await createProviderOrService(
      {
        ...baseFormData,
        creationMode: 'recommendation',
        userEmail: 'tip@example.com',
        no_alcohol: null,
        no_pork: null,
        no_gambling: null,
      } as ProviderFormData & { userEmail: string },
      null,
      true,
    );

    const ext = mockFoodExtUpsert.mock.calls[0][0];
    expect(ext.no_alcohol).toBeNull();
    expect(ext.no_pork).toBeNull();
    expect(ext.no_gambling).toBeNull();
  });
});

// ── Halal gate mock helpers ──────────────────────────────────────────────────

function mockGateProvider(listingType: string, extRow: Record<string, unknown> | null) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'providers') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { listing_type: listingType }, error: null }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          single: async () =>
            extRow === null
              ? { data: null, error: { message: 'no rows' } }
              : { data: extRow, error: null },
        }),
      }),
    };
  });
}

describe('C2: halal gate distinguishes denied vs unanswered (AC6.3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows approval when all three attestations are true', async () => {
    mockGateProvider('food', { no_alcohol: true, no_pork: true, no_gambling: true });
    const r = await checkHalalAttestation('p1');
    expect(r.allAttested).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('blocks approval when an attestation is false and reports it as denied', async () => {
    mockGateProvider('food', { no_alcohol: false, no_pork: true, no_gambling: true });
    const r = await checkHalalAttestation('p1');
    expect(r.allAttested).toBe(false);
    expect(r.denied).toEqual(['no_alcohol']);
    expect(r.unanswered).toEqual([]);
    expect(r.missing).toEqual(['no_alcohol']);
  });

  it('blocks approval when an attestation is NULL and reports it as unanswered', async () => {
    mockGateProvider('food', { no_alcohol: true, no_pork: null, no_gambling: true });
    const r = await checkHalalAttestation('p1');
    expect(r.allAttested).toBe(false);
    expect(r.denied).toEqual([]);
    expect(r.unanswered).toEqual(['no_pork']);
    expect(r.missing).toEqual(['no_pork']);
  });

  it('reports a missing extension row as unanswered, not denied', async () => {
    mockGateProvider('store', null);
    const r = await checkHalalAttestation('p1');
    expect(r.allAttested).toBe(false);
    expect(r.denied).toEqual([]);
    expect(r.unanswered).toEqual(['no_alcohol', 'no_pork', 'no_gambling']);
  });

  it('the 422 message separates denied from unanswered', () => {
    const src = readSrc('src/app/api/admin/review-provider/route.ts');
    expect(src).toContain('attestation.deniedLabels');
    expect(src).toContain('attestation.unansweredLabels');
  });
});

describe('C2: shared HalalAttestationFields in both flows (AC6.1)', () => {
  it('emits true for yes, false for no, null for not sure', () => {
    const onChange = vi.fn();
    render(
      <HalalAttestationFields
        values={{ no_alcohol: null, no_pork: null, no_gambling: null }}
        onChange={onChange}
      />,
    );

    const groups = screen.getAllByRole('radiogroup');
    expect(groups).toHaveLength(3);

    const buttons = screen.getAllByRole('radio');
    // 3 questions x 3 options
    expect(buttons).toHaveLength(9);

    fireEvent.click(buttons[0]); // first question, yes
    expect(onChange).toHaveBeenCalledWith('no_alcohol', true);
    fireEvent.click(buttons[1]); // first question, no
    expect(onChange).toHaveBeenCalledWith('no_alcohol', false);
    fireEvent.click(buttons[2]); // first question, not sure
    expect(onChange).toHaveBeenCalledWith('no_alcohol', null);
  });

  it('create/halal renders the shared component and no longer leaks tiers (AC6.4)', () => {
    const src = readSrc('src/app/(public)/create/halal/page.tsx');
    expect(src).toContain('HalalAttestationFields');
    expect(src).not.toContain('Bronze');
    expect(src).not.toContain('Silber');
    expect(src).not.toContain('Gold');
  });

  it('StreamlinedRecommendForm renders the shared component wired to form context', () => {
    const src = readSrc('src/features/providers/StreamlinedRecommendForm.tsx');
    expect(src).toContain('HalalAttestationFields');
    expect(src).toContain('contextFormData.no_alcohol');
  });
});

describe('C2 fix: NULL round-trips through the admin edit path (#415 defect 1)', () => {
  it('buildExtensionFieldsPayload preserves NULL instead of coercing to false', () => {
    const payload = buildExtensionFieldsPayload(
      { noAlcohol: null, noPork: null, noGambling: null },
      'food',
    );
    expect(payload.food_providers).toMatchObject({
      no_alcohol: null,
      no_pork: null,
      no_gambling: null,
    });
  });

  it('admin edit schema accepts NULL attestation values', () => {
    const src = readSrc('src/lib/validations/adminSchemas.ts');
    for (const f of ['noAlcohol', 'noPork', 'noGambling']) {
      expect(src).toContain(`${f}: z.boolean().nullable().optional()`);
    }
  });

  it('the three edit-form load sites no longer coalesce NULL to false', () => {
    const halalPage = readSrc('src/app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx');
    const valuesPage = readSrc('src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx');
    const editForm = readSrc('src/features/providers/pages/ProviderEditForm.tsx');

    for (const [name, src] of [
      ['halal page', halalPage],
      ['values page', valuesPage],
      ['ProviderEditForm', editForm],
    ] as const) {
      expect(src, name).not.toMatch(/no_alcohol.*\?\? false|noAlcohol.*\?\? false/);
    }
    // The two sub-pages render the shared tri-state component; ProviderEditForm
    // only carries the values through to the PATCH body.
    expect(halalPage).toContain('HalalAttestationFields');
    expect(valuesPage).toContain('HalalAttestationFields');
  });
});

describe('C2 fix: all-NULL means no halal data, not not-halal (#415 defect 2)', () => {
  it('computeHalalStars treats all-NULL like absent attestation data', () => {
    const absent = computeHalalStars({ verification_method: 'online' });
    const allNull = computeHalalStars({
      verification_method: 'online',
      no_alcohol: null,
      no_pork: null,
      no_gambling: null,
    });
    expect(allNull).toBe(absent);
  });

  it('computeHalalStars still returns 0 when attestations are explicitly false', () => {
    expect(
      computeHalalStars({
        verification_method: 'online',
        no_alcohol: false,
        no_pork: false,
        no_gambling: false,
      }),
    ).toBe(0);
  });
});

describe('C2: migrations (nullable attestations + policies)', () => {
  it('129 makes all three attestation columns nullable on both extension tables', () => {
    const sql = readSrc('supabase/migrations/129_halal_attestation_nullable.sql');
    for (const table of ['food_providers', 'store_providers']) {
      expect(sql).toContain(`ALTER TABLE public.${table}`);
    }
    for (const col of ['no_alcohol', 'no_pork', 'no_gambling']) {
      expect(sql).toMatch(new RegExp(`ALTER COLUMN ${col}\\s+DROP NOT NULL`));
      expect(sql).toMatch(new RegExp(`ALTER COLUMN ${col}\\s+DROP DEFAULT`));
    }
  });

  it('130 lets a creator read their own pending row but keeps pending hidden from others', () => {
    const sql = readSrc('supabase/migrations/130_provider_submission_policies.sql');
    // self-read widened
    expect(sql).toContain('"user_created_id" = ( SELECT "auth"."uid"() AS "uid"))');
    // public visibility still gated on approved
    expect(sql).toContain('"review_status" = \'approved\'::"public"."review_status"');
  });

  it('130 constrains client inserts to review_status pending while admin inserts stay unconstrained', () => {
    const sql = readSrc('supabase/migrations/130_provider_submission_policies.sql');
    expect(sql).toContain('"review_status" = \'pending\'::"public"."review_status"');
    // The pending constraint sits in the client branch; the admin/moderator
    // EXISTS branch remains outside it (admin writes unaffected).
    const adminBranch = sql.indexOf('\'moderator\'::"public"."user_role"');
    const pendingCheck = sql.indexOf('"review_status" = \'pending\'');
    expect(adminBranch).toBeGreaterThan(-1);
    expect(pendingCheck).toBeGreaterThan(adminBranch);
    // Admin approve path (review-provider route) still works via service role,
    // which bypasses RLS; migration 128 backfill uses UPDATE, not INSERT.
  });
});
