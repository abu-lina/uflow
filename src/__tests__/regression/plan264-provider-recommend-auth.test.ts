// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let cookieJar: Record<string, string> = {};
const authUser = { id: 'admin-uuid', email: 'admin@example.com', aud: 'authenticated' };

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name in cookieJar ? { name, value: cookieJar[name] } : undefined),
    getAll: () => Object.entries(cookieJar).map(([name, value]) => ({ name, value })),
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: vi.fn() }));

function makeAdminClient() {
  const providerInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'providers') return { insert: providerInsert };
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
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'food_providers') {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    }),
  };

  return { client, providerInsert };
}

function makeRecommendationRequest() {
  return new NextRequest('http://localhost:3000/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creationMode: 'recommendation',
      title: 'Test Restaurant',
      category: '20c10efe-404b-4a39-bb81-5089a0332d78',
      no_alcohol: true,
      no_pork: true,
      no_gambling: true,
      imageUrls: [],
    }),
  });
}

describe('Plan 264 provider recommendation authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    cookieJar = {};
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/v1/user')) {
          return new Response(JSON.stringify(authUser), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response('{}', { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[pre-fix FAILS] cookie-synced recommendation is created for its session user [post-fix PASSES]', async () => {
    const { POST: setAuthCookies } = await import('@/app/api/auth/set/route');
    const authSetResponse = await setAuthCookies(
      new NextRequest('http://localhost:3000/api/auth/set', {
        method: 'POST',
        body: JSON.stringify({
          access_token: 'valid-access-token',
          refresh_token: 'refresh-token',
        }),
      }),
    );
    const issuedCookies = authSetResponse.cookies.getAll();

    expect(issuedCookies.map(({ name }) => name).sort()).toEqual([
      'sb-access-token',
      'sb-refresh-token',
    ]);
    expect(authSetResponse.headers.get('set-cookie')).toMatch(/SameSite=Lax/i);
    for (const { name, value } of issuedCookies) cookieJar[name] = value;

    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { client, providerInsert } = makeAdminClient();
    vi.mocked(getSupabaseAdmin).mockReturnValue(client as never);
    const { POST } = await import('@/app/api/providers/route');

    const response = await POST(makeRecommendationRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider_id).toBeTruthy();
    expect(providerInsert.mock.calls[0][0][0].user_created_id).toBe(authUser.id);
    expect(providerInsert.mock.calls[0][0][0].provider_owner_id).toBeNull();
  });

  it('rejects anonymous submissions before resolving the admin client', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    const { POST } = await import('@/app/api/providers/route');

    const response = await POST(makeRecommendationRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Authentication required' });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
