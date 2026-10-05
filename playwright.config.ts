import { defineConfig, devices } from '@playwright/test';

import { resolveSupabaseEnv } from './e2e/fixtures';

// Override with PLAYWRIGHT_BASE_URL to point the suite at a server on a
// non-default port (e.g. when :3000 is held by another worktree's server).
// When set, start that server yourself — webServer still spawns `dev`/`start`
// on the default port if nothing answers at baseURL.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

const supabase = resolveSupabaseEnv();

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  retries: 0,
  reporter: [['list'], ['html']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // No service worker unless a spec is actually testing one. Since request 282
    // the suite runs against a production build, so every page load registered a
    // worker and precached 290 URLs, in specs that assert nothing about the PWA.
    //
    // That is what put CI red (run 37031029612). Proven locally: a service
    // worker's own SCRIPT fetch does NOT carry the context's `extraHTTPHeaders`,
    // so `e2e/fixtures.ts`'s synthetic per-test IP does not apply to it and it
    // falls into `getTrustedClientIp`'s shared 'unknown' bucket. Exhaust that
    // bucket (105 header-less requests) and a fresh-IP page load still fails with
    // `A bad HTTP response code (429) was received when fetching the script`,
    // while the same path with a header returns 200. Six specs' worth of
    // worker traffic spent the bucket before the PWA spec ran.
    //
    // `e2e/sw-session-boundary.spec.ts` is unaffected: it launches its own
    // persistent context with `serviceWorkers: 'allow'`. `e2e/pwa.spec.ts` only
    // uses `request`. Those two are where the worker is under test; nothing else
    // needs one, and a worker intercepting navigations mid-test is cross-test
    // noise either way.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    },
  },
});
