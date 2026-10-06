// @vitest-environment node
/**
 * Issue 547 — pending providers hard-404 for the caller who created them.
 *
 * Root cause: the /p/<id> route guard (#533) ran an anon PostgREST select on
 * `providers`, and anon RLS exposes only review_status='approved' rows. Every
 * pending/rejected provider looked "absent" to the guard, so every
 * quick-create submission landed on a real 404 — including for its creator.
 *
 * Fix: the guard keeps the anon select as the fast path (approved => visible
 * to everyone, identical cost to before) and only escalates to the
 * caller-aware `provider_route_visibility` RPC — carrying the caller's
 * sb-access-token cookie as the bearer — when the anon select finds nothing
 * and the request carries a session. The RPC applies the same
 * `provider_is_visible` predicate the RLS policy uses, so guard and page
 * cannot diverge. Non-UUID /p/<junk> 404s without any round trip.
 *
 * These tests run the real middleware + real route guard against a stubbed
 * PostgREST and assert HTTP STATUS CODES, not rendered copy. The stub
 * emulates what the DB does: the anon select returns approved rows only, and
 * the RPC resolves 'visible' only when the bearer token belongs to the
 * creator or an admin — the guard forwards the cookie token verbatim.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_URL = 'https://mock-supabase-url.com';
const ANON_KEY = 'sb_publishable_mock_anon_key_for_tests';

const APPROVED_ID = '11111111-2222-3333-4444-555555555555';
const PENDING_ID = '2e3f9942-8cce-4570-a474-24cba76963f0';
const ABSENT_ID = '00000000-0000-0000-0000-000000000000';

// Fake bearer tokens, one per caller class. The stub plays the role of the
// database: it decides visibility from the Authorization header exactly the
// way auth.uid() + provider_is_visible() would on the server.
const CREATOR_TOKEN = 'fake-creator-token';
const ADMIN_TOKEN = 'fake-admin-token';
const UNRELATED_TOKEN = 'fake-unrelated-user-token';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Emulates PostgREST + the provider_route_visibility RPC:
 * - `providers?provider_id=eq.<id>` (anon select) answers only the approved row
 * - the RPC answers 'visible'/'hidden'/'absent' from the bearer token,
 *   mirroring provider_is_visible on the server.
 */
function stubSupabase(opts?: { rpcThrows?: boolean }) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url.includes('/rest/v1/rpc/provider_route_visibility')) {
      if (opts?.rpcThrows) throw new Error('rpc exploded');
      const auth = new Headers(init?.headers).get('Authorization') ?? '';
      const body = JSON.parse(String(init?.body)) as { p_provider_id?: string };
      const id = body.p_provider_id;

      if (id === ABSENT_ID) return jsonResponse('absent');
      if (id === APPROVED_ID) return jsonResponse('visible');
      if (id === PENDING_ID) {
        return auth === `Bearer ${CREATOR_TOKEN}` || auth === `Bearer ${ADMIN_TOKEN}`
          ? jsonResponse('visible')
          : jsonResponse('hidden');
      }
      return jsonResponse('absent');
    }

    if (url.includes('/rest/v1/providers')) {
      // The anon-visible set: approved rows only, matching the RLS policy.
      if (url.includes(`provider_id=eq.${APPROVED_ID}`)) {
        return jsonResponse([{ provider_id: APPROVED_ID }]);
      }
      return jsonResponse([]);
    }

    throw new Error(`unexpected fetch: ${url}`);
  });
}

let counter = 0;

async function runMiddleware(pathname: string, cookie?: string) {
  const { middleware } = await import('@/middleware');
  const { NextRequest } = await import('next/server');
  const headers: Record<string, string> = {
    'user-agent': 'vitest',
    // unique IP per request so the in-memory rate limiter never interferes
    'x-forwarded-for': `10.55.55.${(counter++ % 200) + 1}`,
  };
  if (cookie) headers.cookie = cookie;
  const req = new NextRequest(new URL(`http://localhost:3000${pathname}`), { headers });
  return middleware(req);
}

describe('issue 547 — /p/<id> visibility by caller', () => {
  beforeEach(() => {
    vi.resetModules();
    counter = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    vi.doMock('@/lib/middleware-utils', () => ({
      shouldRedirectToWaitlist: vi.fn(async () => false),
    }));
    vi.stubGlobal('fetch', stubSupabase());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@/lib/middleware-utils');
  });

  it('returns 404 for a provider id that does not exist', async () => {
    const res = await runMiddleware(`/p/${ABSENT_ID}`);
    expect(res?.status).toBe(404);
  });

  it('returns 404 for a non-UUID /p/<junk> without hitting the database', async () => {
    const fetchSpy = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware('/p/not-a-uuid');
    expect(res?.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 200 for an approved provider', async () => {
    const res = await runMiddleware(`/p/${APPROVED_ID}`);
    expect(res?.status).toBe(200);
  });

  it('returns 404 for a pending provider requested anonymously', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`);
    expect(res?.status).toBe(404);
  });

  it('returns 404 for a pending provider requested by an unrelated signed-in user', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${UNRELATED_TOKEN}`);
    expect(res?.status).toBe(404);
  });

  it('returns 200 for a pending provider requested by its creator', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expect(res?.status).toBe(200);
  });

  it('returns 200 for a pending provider requested by an admin', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${ADMIN_TOKEN}`);
    expect(res?.status).toBe(200);
  });

  it('fails open when the visibility RPC throws: a backend blip must not 404 a real page', async () => {
    vi.stubGlobal('fetch', stubSupabase({ rpcThrows: true }));
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expect(res?.status).toBe(200);
  });

  it('sends the caller token as the RPC bearer so auth.uid() resolves', async () => {
    const fetchSpy = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);

    const rpcCall = fetchSpy.mock.calls.find(([input]) =>
      String(input instanceof Request ? input.url : input).includes(
        '/rest/v1/rpc/provider_route_visibility',
      ),
    );
    expect(rpcCall).toBeDefined();
    const headers = new Headers(rpcCall?.[1]?.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${CREATOR_TOKEN}`);
  });
});
