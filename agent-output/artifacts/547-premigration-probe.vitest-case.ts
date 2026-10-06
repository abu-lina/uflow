// @vitest-environment node
/**
 * Code-review probe (not part of the suite): what does the shipped guard do
 * TODAY, with migration 137 unapplied, so PostgREST answers 404 for
 * /rest/v1/rpc/provider_route_visibility?
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_URL = 'https://mock-supabase-url.com';
const PENDING_ID = '2e3f9942-8cce-4570-a474-24cba76963f0';

function rpcMissingStub() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/rest/v1/rpc/provider_route_visibility')) {
      // PostgREST when the function does not exist
      return new Response(
        JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('/rest/v1/providers')) {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
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
    'x-forwarded-for': `10.66.66.${(counter++ % 200) + 1}`,
  };
  if (cookie) headers.cookie = cookie;
  return middleware(new NextRequest(new URL(`http://localhost:3000${pathname}`), { headers }));
}

describe('pre-migration: RPC absent', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_mock';
    vi.doMock('@/lib/middleware-utils', () => ({
      shouldRedirectToWaitlist: vi.fn(async () => false),
    }));
    vi.stubGlobal('fetch', rpcMissingStub());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@/lib/middleware-utils');
  });

  it('anon on a pending provider still 404s (migration-independent)', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`);
    expect(res?.status).toBe(404);
  });

  it('ANY signed-in caller on a pending provider gets a NON-404 status', async () => {
    const res = await runMiddleware(`/p/${PENDING_ID}`, 'sb-access-token=any-token-at-all');
    // 200 here means: guard failed open, page will notFound() -> soft 404.
    expect(res?.status).toBe(200);
  });
});
