import { execFileSync } from 'node:child_process';

import { test as base } from '@playwright/test';

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
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    let hash = 0;
    for (const c of testInfo.testId) hash = (hash * 31 + c.charCodeAt(0)) | 0;
    const ip = `10.231.${(testInfo.parallelIndex * 8 + testInfo.workerIndex + 1) % 256}.${
      (Math.abs(hash) + testInfo.retry) % 256
    }`;
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip });
    await use(page);
  },
});
export { expect } from '@playwright/test';
