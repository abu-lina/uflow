// @vitest-environment node
/**
 * #606 — POST /api/providers must never 500 on bad-but-honest input.
 *
 * Regression coverage for the production 500: categories with
 * applicable_section 'all' could not resolve a listing_type and the bare
 * throw surfaced as a 37-byte generic 500.
 *
 * Contracts locked down here:
 * - An 'all'-section category resolves via the slug-keyed fallback map
 *   (real prod data: food-drink->food, other->food, services->store).
 * - A category the resolver has never seen still submits (default 'food');
 *   nothing about the category's section may ever produce a 500 again.
 * - Genuinely bad input is a coded 4xx, never a 500: unknown category,
 *   missing halal answers, city outside the closed list, duplicate.
 * - The duplicate check (rule R1: normalised name AND normalised city)
 *   returns 409; a pending match carries no href, a rejected match is
 *   never revealed at all.
 * - Every error body carries an opaque `code`; no internals leak.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

let POST: typeof import('@/app/api/providers/route').POST;

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));

const STORAGE_ORIGIN = 'https://test.supabase.co';

// Real category ids from the local seed (same ids the prod log named).
const CATEGORY = {
  foodAndDrink: '20c10efe-404b-4a39-bb81-5089a0332d78', // 'all' locally + prod
  other: '5e5d910d-d790-4184-a061-9cd74d0950e8', // 'all', the prod-trace category
  services: '1288f269-2cdb-47e8-bd8e-9d552ff25e83', // 'all' locally + prod
  brandNew: '11111111-2222-4333-8444-555555555555', // never-seen 'all' category
  unknown: '99999999-9999-4999-8999-999999999999', // no categories row
};

interface CategoryRow {
  applicable_section: string;
  slug?: string | null;
  name_en?: string | null;
  name_de?: string | null;
}

interface ProviderRow {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
  review_status: 'approved' | 'pending' | 'rejected';
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/providers', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function validBody(over: Record<string, unknown> = {}) {
  return {
    creationMode: 'recommendation',
    entityType: 'provider',
    title: 'Test Restaurant',
    category: CATEGORY.foodAndDrink,
    description: '',
    isOnlineBusiness: false,
    street: '',
    zip: '',
    city: 'Berlin',
    country: '',
    latitude: null,
    longitude: null,
    showAddress: true,
    website: '',
    instagram: '',
    phone: '',
    email: '',
    offers_ids: [],
    needs_ids: [],
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
    certificate_url: '',
    imageUrls: [],
    ...over,
  };
}

interface AdminMockOptions {
  category?: CategoryRow | null;
  providers?: ProviderRow[];
  cities?: string[];
  failInsert?: boolean;
}

function makeAdminClient(opts: AdminMockOptions = {}) {
  const providerInsert = vi.fn().mockResolvedValue(
    opts.failInsert ? { error: { message: 'insert denied by constraint xyz' } } : { error: null },
  );
  const category =
    opts.category === undefined
      ? ({ applicable_section: 'food', slug: 'turkish', name_en: 'Turkish', name_de: 'Türkisch' } as CategoryRow)
      : opts.category;

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => providerInsert(...args),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          select: () => ({
            not: async () => ({ data: opts.providers ?? [], error: null }),
          }),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              single: async () =>
                category === null
                  ? { data: null, error: { code: 'PGRST116', message: 'no rows' } }
                  : { data: category, error: null },
            }),
          }),
        };
      }
      if (table === 'cities') {
        return {
          select: async () => ({
            data: (opts.cities ?? ['Berlin', 'München']).map((city_name) => ({ city_name })),
            error: null,
          }),
        };
      }
      if (table === 'locations') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'food_providers' || table === 'store_providers') {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'badge_types') {
        return { select: () => ({ in: async () => ({ data: [], error: null }) }) };
      }
      if (table === 'provider_badges' || table === 'provider_engagements') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
  };

  return { client, providerInsert };
}

describe('#606 POST /api/providers — no more 500s on honest input', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE_ORIGIN);
    ({ POST } = await import('@/app/api/providers/route'));
    vi.clearAllMocks();
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    vi.mocked(getUserFromCookie).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function post(body: unknown, adminOpts: AdminMockOptions = {}) {
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { client, providerInsert } = makeAdminClient(adminOpts);
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);
    const response = await POST(makeRequest(body));
    const json = (await response.json()) as Record<string, unknown>;
    return { response, json, providerInsert };
  }

  it('anonymous submitter gets a coded 401', async () => {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    vi.mocked(getUserFromCookie).mockResolvedValue(null as never);
    const { response, json } = await post(validBody());
    expect(response.status).toBe(401);
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  // The exact production failure: 'all'-section categories on a logged-in
  // submit. Real sections and slugs as they exist in the local seed/prod.
  it.each([
    ['Food & Drink', CATEGORY.foodAndDrink, 'food-drink', 'food'],
    ['Other', CATEGORY.other, 'other', 'food'],
    ['Services', CATEGORY.services, 'services', 'store'],
  ])(
    'all-section category "%s" persists with mapped listing_type %s',
    async (_name, categoryId, slug, listingType) => {
      const { response, providerInsert } = await post(validBody({ category: categoryId }), {
        category: { applicable_section: 'all', slug, name_en: _name, name_de: _name },
      });
      expect(response.status).toBe(200);
      expect(providerInsert.mock.calls[0][0][0].listing_type).toBe(listingType);
    },
  );

  it('a brand-new unmappable category still submits (default food, never a throw)', async () => {
    const { response, providerInsert } = await post(validBody({ category: CATEGORY.brandNew }), {
      category: { applicable_section: 'all', slug: 'brand-new-thing', name_en: 'Brand New Thing' },
    });
    expect(response.status).toBe(200);
    expect(providerInsert.mock.calls[0][0][0].listing_type).toBe('food');
  });

  it('a live section value always wins over the fallback map', async () => {
    // Dev env disagrees: there 'Food & Drink' is a real food category.
    const { response, providerInsert } = await post(
      validBody({ category: CATEGORY.foodAndDrink }),
      { category: { applicable_section: 'store', slug: 'food-drink' } },
    );
    expect(response.status).toBe(200);
    expect(providerInsert.mock.calls[0][0][0].listing_type).toBe('store');
  });

  it('an unknown category id is a coded 400, not a 500', async () => {
    const { response, json } = await post(validBody({ category: CATEGORY.unknown }), {
      category: null,
    });
    expect(response.status).toBe(400);
    expect(json.code).toBe('CATEGORY_UNKNOWN');
    expect(JSON.stringify(json)).not.toContain('PGRST116');
  });

  it('missing halal answers is a coded 400, not a 500', async () => {
    const { response, json } = await post(validBody({ no_gambling: undefined }), {
      category: { applicable_section: 'food', slug: 'turkish' },
    });
    expect(response.status).toBe(400);
    expect(json.code).toBe('HALAL_ATTESTATION_REQUIRED');
  });

  it('a zod rejection is a coded 400 with no raw issue text', async () => {
    const { response, json } = await post({ ...validBody(), message: 'surprise key' });
    expect(response.status).toBe(400);
    expect(json.code).toBe('INVALID_BODY');
    expect(JSON.stringify(json)).not.toContain('Unrecognized');
  });

  it('an unexpected service error is a coded 500 that leaks nothing', async () => {
    const { response, json } = await post(validBody(), { failInsert: true });
    expect(response.status).toBe(500);
    expect(json.code).toBe('SUBMIT_FAILED');
    expect(JSON.stringify(json)).not.toContain('constraint xyz');
    expect(JSON.stringify(json)).not.toContain('insert denied');
  });

  describe('duplicate detection (rule R1: normalised name AND city)', () => {
    const existingApproved: ProviderRow = {
      provider_id: 'aaaa1111-0000-4000-8000-000000000001',
      provider_name: 'Test Restaurant',
      address_city: 'Berlin',
      review_status: 'approved',
    };

    it('exact name+city on an approved provider → 409 with link', async () => {
      const { response, json, providerInsert } = await post(validBody(), {
        providers: [existingApproved],
      });
      expect(response.status).toBe(409);
      expect(json.code).toBe('PROVIDER_DUPLICATE');
      const existing = json.existing as Record<string, unknown>;
      expect(existing.provider_id).toBe(existingApproved.provider_id);
      expect(existing.href).toBe(`/p/${existingApproved.provider_id}`);
      expect(providerInsert).not.toHaveBeenCalled();
    });

    it('diacritic and punctuation variants still match', async () => {
      const { response } = await post(validBody({ title: 'TEST  restaurant!', city: 'berlin' }), {
        providers: [existingApproved],
      });
      expect(response.status).toBe(409);
    });

    it('a pending match → 409 with no href and no id leak', async () => {
      const { response, json } = await post(validBody(), {
        providers: [{ ...existingApproved, review_status: 'pending' }],
      });
      expect(response.status).toBe(409);
      expect(json.code).toBe('PROVIDER_DUPLICATE');
      const existing = json.existing as Record<string, unknown>;
      expect(existing.href).toBeUndefined();
      expect(existing.status).toBe('pending');
    });

    it('a rejected provider is never revealed — submit proceeds', async () => {
      const { response, providerInsert } = await post(validBody(), {
        providers: [{ ...existingApproved, review_status: 'rejected' }],
      });
      expect(response.status).toBe(200);
      expect(providerInsert).toHaveBeenCalled();
    });

    it('same name in a different city is not a duplicate', async () => {
      const { response, providerInsert } = await post(validBody(), {
        providers: [{ ...existingApproved, address_city: 'Hamburg' }],
      });
      expect(response.status).toBe(200);
      expect(providerInsert).toHaveBeenCalled();
    });
  });

  describe('closed city list on the recommend path', () => {
    it('recommend submission with a city outside the list → 400 CITY_NOT_SUPPORTED', async () => {
      const { response, json, providerInsert } = await post(
        validBody({ submissionSource: 'recommend', city: 'Atlantis' }),
        { cities: ['Berlin', 'München'] },
      );
      expect(response.status).toBe(400);
      expect(json.code).toBe('CITY_NOT_SUPPORTED');
      expect(providerInsert).not.toHaveBeenCalled();
    });

    it('a case variant canonicalises to the cities row before insert', async () => {
      const { response, providerInsert } = await post(
        validBody({ submissionSource: 'recommend', city: 'BERLIN' }),
        { cities: ['Berlin'] },
      );
      expect(response.status).toBe(200);
      expect(providerInsert.mock.calls[0][0][0].address_city).toBe('Berlin');
    });

    it('submissions without the recommend marker skip the closed-list check', async () => {
      // The import UI posts creationMode 'recommendation' too but must not be
      // held to the recommend list (its cities come from OSM).
      const { response, providerInsert } = await post(
        validBody({ city: 'Atlantis' }),
        { cities: ['Berlin'] },
      );
      expect(response.status).toBe(200);
      expect(providerInsert).toHaveBeenCalled();
    });
  });
});
