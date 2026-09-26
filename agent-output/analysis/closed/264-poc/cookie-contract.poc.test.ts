// @vitest-environment node
// POC for #264 (analysis only — delete after RCA). Uses the REAL @supabase/ssr
// server client and the REAL route; only next/headers, fetch, and the admin
// client are stubbed. Cookies mirror exactly what /api/auth/set writes.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const cookieJar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (k in cookieJar ? { name: k, value: cookieJar[k] } : undefined),
    getAll: () => Object.entries(cookieJar).map(([name, value]) => ({ name, value })),
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: vi.fn() }));

const fetchCalls: string[] = [];
const realUser = { id: 'admin-uuid', email: 'admin@example.com', aud: 'authenticated' };

beforeEach(() => {
  vi.unmock('zod');
  for (const k of Object.keys(cookieJar)) delete cookieJar[k];
  fetchCalls.length = 0;
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnop.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_' + 'x'.repeat(40));
  // Any call to GoTrue /auth/v1/user succeeds — so a null user can only mean
  // the client never found a token to send.
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchCalls.push(url);
    if (url.includes('/auth/v1/user')) {
      return new Response(JSON.stringify(realUser), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  }));
});

describe('#264 POC — session cookie contract', () => {
  it('A: /api/auth/set cookies are what a logged-in browser carries', async () => {
    const { POST } = await import('@/app/api/auth/set/route');
    const res = await POST(new NextRequest('http://localhost/api/auth/set', {
      method: 'POST',
      body: JSON.stringify({ access_token: 'AT', refresh_token: 'RT' }),
    }));
    const names = res.cookies.getAll().map((c) => c.name).sort();
    console.log('[POC-A] cookies set by /api/auth/set:', names);
    expect(names).toEqual(['sb-access-token', 'sb-refresh-token']);
  });

  it('B: createSupabaseServerClient().auth.getUser() ignores sb-access-token', async () => {
    cookieJar['sb-access-token'] = 'valid.jwt.token';
    cookieJar['sb-refresh-token'] = 'refresh';
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { data, error } = await createSupabaseServerClient().auth.getUser();
    console.log('[POC-B] user:', data.user, 'error:', error?.name, error?.message, 'fetchCalls:', fetchCalls);
    expect(data.user).toBeNull();
    expect(fetchCalls.filter((u) => u.includes('/auth/v1/user'))).toHaveLength(0);
  });

  it('C: getUserFromCookie() resolves the same user from the same cookies', async () => {
    cookieJar['sb-access-token'] = 'valid.jwt.token';
    cookieJar['sb-refresh-token'] = 'refresh';
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();
    console.log('[POC-C] user:', user?.id, 'fetchCalls:', fetchCalls);
    expect(user?.id).toBe('admin-uuid');
  });

  it('D: real POST /api/providers returns 401 for a logged-in (cookie-synced) user', async () => {
    cookieJar['sb-access-token'] = 'valid.jwt.token';
    cookieJar['sb-refresh-token'] = 'refresh';
    const { POST } = await import('@/app/api/providers/route');
    const res = await POST(new NextRequest('http://localhost/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creationMode: 'recommendation', title: 'X', category: '' }),
    }));
    const body = await res.json();
    console.log('[POC-D] status:', res.status, 'body:', body);
    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('E: route WOULD accept a session if it were stored under the ssr "sb" cookie', async () => {
    // Positive control: proves the route's getUser works when the cookie shape
    // matches what @supabase/ssr expects — isolates the failure to cookie naming/format.
    const session = {
      access_token: 'valid.jwt.token', refresh_token: 'refresh', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: realUser,
    };
    cookieJar['sb'] = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const { data } = await createSupabaseServerClient().auth.getUser();
    console.log('[POC-E] user:', data.user?.id, 'fetchCalls:', fetchCalls);
    expect(data.user?.id).toBe('admin-uuid');
  });
});
