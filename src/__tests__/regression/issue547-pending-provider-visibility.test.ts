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
 * PostgREST and discriminate the guard's actual DECISION, not just a status
 * code: pass-through (`x-middleware-next`, no rewrite header) versus
 * rewrite-to-404 (`x-middleware-rewrite` + status 404), plus whether the RPC
 * was invoked and what it answered. A bare `expect(status).toBe(200)` cannot
 * tell a real render from the guard failing open, which is what hid the
 * missing-RPC defect in the first place.
 *
 * The stub emulates what the DB does: the anon select returns approved rows
 * only, and the RPC resolves 'visible' only when the bearer token belongs to
 * the creator or an admin — the guard forwards the cookie token verbatim.
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

interface RpcInvocation {
  auth: string | null;
  id: string | undefined;
  /** The tri-state string the stub returned. Undefined when the RPC never ran. */
  answer: 'visible' | 'hidden' | 'absent';
}

/**
 * Emulates PostgREST + the provider_route_visibility RPC:
 * - `providers?provider_id=eq.<id>` (anon select) answers only the approved row
 * - the RPC answers 'visible'/'hidden'/'absent' from the bearer token,
 *   mirroring provider_is_visible on the server.
 *
 * `rpcCalls` records every invocation of the RPC branch: a test that asserts
 * on it goes red if the RPC branch is removed from the stub, which is the
 * exact failure the pre-rework assertions could not see.
 *
 * Options model deployment and auth states, not exceptions:
 * - `rpcMissing`: PostgREST answers 404 PGRST202 — literally what PROD does
 *   while migration 137 is unapplied.
 * - `rpcUnauthorized`: PostgREST answers 401 — a forged or expired bearer JWT.
 * - `rpcThrows`: the fetch itself rejects — a transient network failure.
 */
function stubSupabase(opts?: {
  rpcMissing?: boolean;
  rpcUnauthorized?: boolean;
  rpcThrows?: boolean;
}) {
  const rpcCalls: RpcInvocation[] = [];
  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url.includes('/rest/v1/rpc/provider_route_visibility')) {
      if (opts?.rpcThrows) throw new Error('rpc exploded');
      if (opts?.rpcMissing) {
        return jsonResponse(
          {
            code: 'PGRST202',
            message:
              'Could not find the function public.provider_route_visibility(p_provider_id) in the schema cache',
          },
          404,
        );
      }
      if (opts?.rpcUnauthorized) {
        return jsonResponse({ code: 'PGRST301', message: 'JWT expired' }, 401);
      }
      const auth = new Headers(init?.headers).get('Authorization');
      const body = JSON.parse(String(init?.body)) as { p_provider_id?: string };
      const id = body.p_provider_id;

      let answer: RpcInvocation['answer'];
      if (id === ABSENT_ID) answer = 'absent';
      else if (id === APPROVED_ID) answer = 'visible';
      else if (id === PENDING_ID) {
        answer =
          auth === `Bearer ${CREATOR_TOKEN}` || auth === `Bearer ${ADMIN_TOKEN}`
            ? 'visible'
            : 'hidden';
      } else answer = 'absent';

      rpcCalls.push({ auth, id, answer });
      return jsonResponse(answer);
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
  return { fetchSpy, rpcCalls };
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

/**
 * The guard's decision is observable at the middleware seam:
 * - pass-through: `NextResponse.next()` -> `x-middleware-next: 1`, no rewrite
 * - 404: `NextResponse.rewrite(url, {status:404})` -> `x-middleware-rewrite`
 * A bare 200 is ambiguous — the page can still soft-404 behind it — so every
 * "passes" assertion also pins the mechanism.
 */
function expectPassThrough(res: Response | undefined | null) {
  expect(res?.status).toBe(200);
  expect(res?.headers.get('x-middleware-next')).toBe('1');
  expect(res?.headers.get('x-middleware-rewrite')).toBeNull();
}

function expectRewritten404(res: Response | undefined | null) {
  expect(res?.status).toBe(404);
  expect(res?.headers.get('x-middleware-rewrite')).toContain('/p/');
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
    vi.stubGlobal('fetch', stubSupabase().fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@/lib/middleware-utils');
  });

  it('returns 404 for a provider id that does not exist', async () => {
    const res = await runMiddleware(`/p/${ABSENT_ID}`);
    expectRewritten404(res);
  });

  it('returns 404 for a non-UUID /p/<junk> without hitting the database', async () => {
    const { fetchSpy } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware('/p/not-a-uuid');
    expectRewritten404(res);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('passes through for an approved provider via the anon fast path, without the RPC', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${APPROVED_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectPassThrough(res);
    // The anon select answered, so the RPC must never run — even signed in.
    expect(rpcCalls).toHaveLength(0);
  });

  it('returns 404 for a pending provider requested anonymously, without calling the RPC', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`);
    expectRewritten404(res);
    expect(rpcCalls).toHaveLength(0);
  });

  it('returns 404 for a pending provider requested by an unrelated signed-in user', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${UNRELATED_TOKEN}`);
    expectRewritten404(res);
    // The 404 must come from the RPC's 'hidden' answer, not from the RPC
    // failing — a missing RPC would make this pass for the wrong reason.
    expect(rpcCalls).toEqual([
      { auth: `Bearer ${UNRELATED_TOKEN}`, id: PENDING_ID, answer: 'hidden' },
    ]);
  });

  it('passes through for a pending provider requested by its creator', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectPassThrough(res);
    // Pass-through must be earned by an explicit 'visible', not by the guard
    // failing open when the RPC cannot answer.
    expect(rpcCalls).toEqual([
      { auth: `Bearer ${CREATOR_TOKEN}`, id: PENDING_ID, answer: 'visible' },
    ]);
  });

  it('passes through for a pending provider requested by an admin', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${ADMIN_TOKEN}`);
    expectPassThrough(res);
    expect(rpcCalls).toEqual([
      { auth: `Bearer ${ADMIN_TOKEN}`, id: PENDING_ID, answer: 'visible' },
    ]);
  });

  it('returns 404 when the RPC does not exist (PGRST202): the pre-migration state degrades to a hard 404', async () => {
    // PostgREST answers 404 PGRST202 for an unknown function — that is PROD
    // while migration 137 is unapplied. It is a deployment state, not a
    // transient fault, so the guard must NOT fail open: failing open hands
    // every signed-in caller a 200 whose page body then notFound()s — the
    // #533 soft 404, reintroduced. Degrading to a hard 404 matches what main
    // does today, so code and migration can deploy in either order.
    const { fetchSpy } = stubSupabase({ rpcMissing: true });
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectRewritten404(res);
  });

  it('returns 404 when the caller JWT is rejected (401): a forged or expired token is effectively anon', async () => {
    // sb-access-token is client-settable. PostgREST rejects a bad JWT with
    // 401, and the anon fast path has already determined the row is not
    // publicly visible — so the correct answer is the same hard 404 an anon
    // caller gets, never a pass-through.
    const { fetchSpy } = stubSupabase({ rpcUnauthorized: true });
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectRewritten404(res);
  });

  it('still fails open when the RPC throws: a transient blip must not 404 a real page', async () => {
    const { fetchSpy } = stubSupabase({ rpcThrows: true });
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectPassThrough(res);
  });

  it('still fails open when the RPC answers 5xx', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/rest/v1/rpc/provider_route_visibility')) {
        return jsonResponse({ code: '55000', message: 'upstream error' }, 503);
      }
      if (url.includes('/rest/v1/providers')) return jsonResponse([]);
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchSpy);
    const res = await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);
    expectPassThrough(res);
  });

  it('sends the caller token as the RPC bearer so auth.uid() resolves', async () => {
    const { fetchSpy, rpcCalls } = stubSupabase();
    vi.stubGlobal('fetch', fetchSpy);
    await runMiddleware(`/p/${PENDING_ID}`, `sb-access-token=${CREATOR_TOKEN}`);

    expect(rpcCalls).toHaveLength(1);
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
