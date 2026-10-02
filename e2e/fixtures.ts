import { execFileSync } from 'node:child_process';

import { test as base, type TestInfo } from '@playwright/test';

export const TEST_EMAIL = 'e2e-smoke@uflow.test';
export const TEST_PASSWORD = 'e2e-smoke-pw-276';

export interface SupabaseEnv {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

interface SupabaseStatusJson {
  API_URL?: string;
  ANON_KEY?: string;
  PUBLISHABLE_KEY?: string;
  SERVICE_ROLE_KEY?: string;
  SECRET_KEY?: string;
}

export function resolveSupabaseEnv(): SupabaseEnv {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envUrl && envAnon && envService) {
    return { apiUrl: envUrl, anonKey: envAnon, serviceRoleKey: envService };
  }

  const status = JSON.parse(
    execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf-8' }),
  ) as SupabaseStatusJson;

  const apiUrl = envUrl ?? status.API_URL;
  const anonKey = envAnon ?? status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const serviceRoleKey = envService ?? status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Could not resolve local Supabase credentials. Is `supabase start` running?');
  }
  return { apiUrl, anonKey, serviceRoleKey };
}

// The middleware rate limiter buckets by x-forwarded-for / x-real-ip /
// cf-connecting-ip and falls back to one shared 'unknown' bucket (30 API
// requests/min). `next start` sets none of them, so without a unique header
// every test shares that bucket and the suite 429s. Give each test its own
// synthetic IP via extraHTTPHeaders instead of disabling the limiter.
//
// Third octet from the worker, fourth from the test id, so two tests running
// concurrently never share a bucket. The /16 differs per fixture:
//   10.230.* request (APIRequestContext)
//   10.231.* page
//   10.232.* e2e/sw-session-boundary.spec.ts, which allocates its own per session
function syntheticIp(prefix: string, testInfo: TestInfo): string {
  let hash = 0;
  for (const c of testInfo.testId) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return `${prefix}.${(testInfo.parallelIndex * 8 + testInfo.workerIndex + 1) % 256}.${
    (Math.abs(hash) + testInfo.retry) % 256
  }`;
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': syntheticIp('10.231', testInfo) });
    await use(page);
  },
  // `request` needs the same treatment as `page`, and not having it is what put
  // CI run 37030165919 red: the built-in APIRequestContext sends no proxy header,
  // so every `request.get()` in the suite lands in the single shared 'unknown'
  // bucket along with any header-less server-side fetch. Both PWA specs open with
  // `request.get('/sw.js')` as a precondition, and once that bucket is spent they
  // fail on a 429 that says nothing about the service worker.
  request: async ({ playwright }, use, testInfo) => {
    const context = await playwright.request.newContext({
      baseURL: testInfo.project.use.baseURL,
      extraHTTPHeaders: { 'x-forwarded-for': syntheticIp('10.230', testInfo) },
    });
    await use(context);
    await context.dispose();
  },
});
export { expect } from '@playwright/test';
