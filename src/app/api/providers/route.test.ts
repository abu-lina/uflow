// @vitest-environment node
/**
 * Plan 263 — POST /api/providers
 *
 * Moves provider/service creation writes behind a server route using the
 * service-role client. Verifies actor derivation (session, not body),
 * payload allowlisting, storage-URL validation, rate limiting, and orphan
 * cleanup when a required child write fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

let POST: typeof import('@/app/api/providers/route').POST;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));

const STORAGE_ORIGIN = 'https://test.supabase.co';
const CATEGORY_UUID = '20c10efe-404b-4a39-bb81-5089a0332d78';

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
    category: CATEGORY_UUID,
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
    imageUrls: [`${STORAGE_ORIGIN}/storage/v1/object/public/provider-images/providers/x.png`],
    ...over,
  };
}

interface AdminMocks {
  providerInsert: ReturnType<typeof vi.fn>;
  providerDeleteEq: ReturnType<typeof vi.fn>;
  locationInsert: ReturnType<typeof vi.fn>;
}

function makeAdminClient(over: { failLocations?: boolean; failDelete?: boolean } = {}): {
  client: unknown;
  mocks: AdminMocks;
} {
  const providerInsert = vi.fn().mockResolvedValue({ error: null });
  const providerDeleteEq = vi
    .fn()
    .mockResolvedValue(over.failDelete ? { error: { message: 'delete denied' } } : { error: null });
  const locationInsert = vi
    .fn()
    .mockResolvedValue(
      over.failLocations ? { error: { message: 'row-level security violation' } } : { error: null },
    );

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => providerInsert(...args),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: () => ({ eq: (...args: unknown[]) => providerDeleteEq(...args) }),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { applicable_section: 'food' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'locations') {
        return { insert: (...args: unknown[]) => locationInsert(...args) };
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

  return { client, mocks: { providerInsert, providerDeleteEq, locationInsert } };
}

function mockSession(userId: string | null) {
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue(
          userId
            ? { data: { user: { id: userId, email: 'user@example.com' } }, error: null }
            : { data: { user: null }, error: { message: 'No user' } },
        ),
    },
  };
}

describe('/api/providers POST', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unmock('zod');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE_ORIGIN);
    ({ POST } = await import('@/app/api/providers/route'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('anonymous recommendation succeeds with null ownership fields', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);
    const { client, mocks } = makeAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await POST(makeRequest(validBody()));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider_id).toBeTruthy();
    const payload = mocks.providerInsert.mock.calls[0][0][0];
    expect(payload.user_created_id).toBeNull();
    expect(payload.provider_owner_id).toBeNull();
    expect(payload.review_status).toBe('pending');
  });

  it('authenticated owner submission sets provider_owner_id to the session user', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession('user-1') as never);
    const { client, mocks } = makeAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await POST(makeRequest(validBody({ creationMode: 'owner' })));

    expect(response.status).toBe(200);
    const payload = mocks.providerInsert.mock.calls[0][0][0];
    expect(payload.user_created_id).toBe('user-1');
    expect(payload.provider_owner_id).toBe('user-1');
  });

  it('authenticated recommendation sets user_created_id but null provider_owner_id', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession('user-1') as never);
    const { client, mocks } = makeAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await POST(makeRequest(validBody({ creationMode: 'recommendation' })));

    expect(response.status).toBe(200);
    const payload = mocks.providerInsert.mock.calls[0][0][0];
    expect(payload.user_created_id).toBe('user-1');
    expect(payload.provider_owner_id).toBeNull();
  });

  it('rejects a body carrying server-owned columns', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession('user-1') as never);

    for (const key of ['provider_id', 'user_created_id', 'provider_owner_id', 'review_status']) {
      const response = await POST(makeRequest(validBody({ [key]: 'spoofed' })));
      expect(response.status, `${key} should be rejected`).toBe(400);
    }
  });

  it('rejects imageUrls that do not point at our Supabase storage', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);

    const response = await POST(
      makeRequest(validBody({ imageUrls: ['https://evil.example.com/x.png'] })),
    );
    expect(response.status).toBe(400);
  });

  it('rejects a certificate_url that does not point at our Supabase storage', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);

    const response = await POST(
      makeRequest(validBody({ certificate_url: 'https://evil.example.com/cert.pdf' })),
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for a missing title', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);

    const body = validBody();
    delete (body as Record<string, unknown>).title;
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(400);
  });

  it('returns 400 for a non-uuid category', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);

    const response = await POST(makeRequest(validBody({ category: 'not-a-uuid' })));
    expect(response.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { checkRateLimit } = await import('@/lib/rate-limit');

    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);
    vi.mocked(checkRateLimit).mockReturnValue(false);

    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(429);
  });

  it('deletes the provider row when a required child write fails (no orphans)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

    vi.mocked(createSupabaseServerClient).mockReturnValue(mockSession(null) as never);
    const { client, mocks } = makeAdminClient({ failLocations: true });
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(500);
    const insertedId = mocks.providerInsert.mock.calls[0][0][0].provider_id;
    expect(mocks.providerDeleteEq).toHaveBeenCalledWith('provider_id', insertedId);
  });
});
