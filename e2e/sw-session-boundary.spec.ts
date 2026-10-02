import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium, type Page } from '@playwright/test';

import { expect, test } from './fixtures';

/**
 * Regression guard for request 281: a per-session service-worker "cleanup" that
 * unregistered every worker, deleted every cache and called location.reload(),
 * once per browser session, forever.
 *
 * The only way to catch it is across a real session boundary. Closing and
 * reopening the SAME persistent Chromium profile drops sessionStorage while the
 * service-worker registration and CacheStorage survive on disk, which is exactly
 * the state the old cleanup triggered on. Playwright's default per-test browser
 * context shares nothing between tests, so it can never reproduce this.
 *
 * location.reload is [LegacyUnforgeable] in Chrome and cannot be stubbed
 * (defineProperty throws), so the forced reload is observed through the
 * performance navigation type plus the document load count. Note the load count
 * and not `framenavigated`: the App Router fires same-document history
 * navigations on the landing page, which move `framenavigated` without any
 * document reload happening.
 */

// ~12x margin over the slowest measured forced reload; see runBrowserSession.
const SESSION_SETTLE_MS = 6_000;
const SW_WAIT_MS = 20_000;

interface SessionSnapshot {
  consoleLines: string[];
  documentLoads: number;
  navigationType: string | null;
  registrations: number;
  cacheKeys: string[];
}

async function probe(page: Page): Promise<Omit<SessionSnapshot, 'consoleLines' | 'documentLoads'>> {
  // A forced reload mid-evaluate destroys the execution context; retry twice
  // (three attempts total) before giving up.
  for (let attempt = 0; ; attempt++) {
    try {
      return await page.evaluate(async () => {
        const [navigation] = performance.getEntriesByType(
          'navigation',
        ) as PerformanceNavigationTiming[];
        return {
          navigationType: (navigation?.type as string | undefined) ?? null,
          registrations: (await navigator.serviceWorker.getRegistrations()).length,
          cacheKeys: 'caches' in window ? await caches.keys() : [],
        };
      });
    } catch (error) {
      if (attempt >= 2) throw error;
      await page.waitForTimeout(2_000);
    }
  }
}

async function waitForServiceWorker(page: Page): Promise<void> {
  const deadline = Date.now() + SW_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const count = await page.evaluate(() =>
        navigator.serviceWorker.getRegistrations().then((r) => r.length),
      );
      if (count > 0) return;
    } catch {
      // execution context destroyed by a navigation; keep polling
    }
    await page.waitForTimeout(500);
  }
}

async function runBrowserSession(
  profileDir: string,
  baseURL: string,
  // The middleware rate limiter buckets by x-forwarded-for. These are page
  // loads, and `src/middleware.ts:137`'s matcher excludes `/api`, so they hit
  // the non-API branch at `src/middleware.ts:115`: 100 requests/min. One
  // landing-page load spends a good part of that, so give every session its own
  // bucket instead of sharing one across the test.
  clientIp: string,
): Promise<SessionSnapshot> {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    serviceWorkers: 'allow',
    baseURL,
    extraHTTPHeaders: { 'x-forwarded-for': clientIp },
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const consoleLines: string[] = [];
    let documentLoads = 0;
    page.on('console', (message) => consoleLines.push(message.text()));
    page.on('load', () => {
      documentLoads += 1;
    });

    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await waitForServiceWorker(page);
    // Fixed settle window, deliberately. There is nothing to wait *for* here:
    // the assertion is that no forced reload happens, and you cannot wait on the
    // absence of an event. A reload landing after the window would make the spec
    // pass for the wrong reason, so the window is sized off measured data: every
    // observed reload fired 8-480ms after first paint (see the diagnosis table
    // in agent-output/requests/281-sw-cleanup-unconditional.md, `/` unthrottled
    // through `/about` deep link, slowest 476ms). 6s is ~12x the slowest
    // observation, which covers it. Do not shorten it.
    await page.waitForTimeout(SESSION_SETTLE_MS);

    return { consoleLines, documentLoads, ...(await probe(page)) };
  } finally {
    // Session boundary: sessionStorage dies here, the registration does not.
    await context.close();
  }
}

test.describe('service worker across a browser session boundary', () => {
  test('a returning session is not forced to reload', async ({ baseURL, request }, testInfo) => {
    // Needs a real generated service worker. `next.config.js:6` only disables
    // the PWA plugin on DISABLE_PWA=true, so measured locally: `next dev`
    // without that flag still writes a dev-stub /sw.js and this runs; with
    // DISABLE_PWA=true nothing is generated, /sw.js 404s, there is nothing for a
    // cleanup to find, and the spec would pass for the wrong reason. Hence the
    // skip. That is a local-only courtesy: in CI the webServer is
    // `npm run start` on a production build, so a non-200 is a broken setup, not
    // a reason to skip. Asserting instead of skipping is what stops CI producing
    // an assertion-free run that looks identical to a pass (a 429, a 5xx or a
    // redirect all used to take the skip path).
    const swResponse = await request.get('/sw.js');
    if (process.env.CI) {
      expect(
        swResponse.status(),
        'CI must serve a real /sw.js; this guard may never skip here',
      ).toBe(200);
    } else {
      test.skip(
        swResponse.status() !== 200,
        '/sw.js is not served: needs a production build with the PWA plugin enabled',
      );
    }

    test.setTimeout(180_000);
    if (!baseURL) throw new Error('baseURL is not configured');
    // 10.232., not 10.231.: `e2e/fixtures.ts:53` hands out
    // `10.231.<parallelIndex * 8 + workerIndex + 1>.<name-hash>`, and with
    // parallelIndex 0 the third octet collides with this one, so a fixture test
    // whose hash lands on 1 or 2 would share a rate-limit bucket with a session
    // here. A different /16 keeps the two allocators apart without touching
    // fixtures.ts, which six other specs depend on.
    const ipForSession = (session: number): string =>
      `10.232.${(testInfo.workerIndex + 1) % 256}.${session}`;
    const profileDir = mkdtempSync(join(tmpdir(), 'uflow-sw-session-'));

    try {
      const first = await runBrowserSession(profileDir, baseURL, ipForSession(1));
      // Precondition, not the assertion under test: if nothing registered, the
      // second session has no worker to wipe and this spec is vacuous.
      expect(
        first.registrations,
        `first session registered no service worker; console: ${first.consoleLines.join(' | ')}`,
      ).toBeGreaterThan(0);

      const second = await runBrowserSession(profileDir, baseURL, ipForSession(2));

      expect(
        second.consoleLines.filter((line) => line.includes('[SW Cleanup]')),
        'no code may unregister workers and wipe caches on a session boundary',
      ).toEqual([]);
      // Every message carries the second session's console so a CI red is
      // diagnosable from the log alone, without downloading the trace.
      const consoleContext = `console: ${second.consoleLines.join(' | ')}`;
      expect(second.navigationType, consoleContext).toBe('navigate');
      expect(
        second.documentLoads,
        `a forced reload shows up as a second document load; ${consoleContext}`,
      ).toBe(1);
      // The registration and the precache must survive the session boundary.
      expect(
        second.registrations,
        `the registration must survive the session boundary; ${consoleContext}`,
      ).toBeGreaterThan(0);
      expect(
        second.cacheKeys.length,
        `the precache must survive the session boundary; ${consoleContext}`,
      ).toBeGreaterThan(0);
    } finally {
      rmSync(profileDir, { recursive: true, force: true });
    }
  });
});
