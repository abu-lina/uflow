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
  // A forced reload mid-evaluate destroys the execution context; retry once.
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
  // The middleware rate limiter buckets by x-forwarded-for and allows 30 API
  // requests/min. One landing-page load spends a good part of that, so give
  // every session its own bucket instead of sharing one across the test.
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
    // Give any forced reload room to land (it fired 8-480ms after first paint).
    await page.waitForTimeout(SESSION_SETTLE_MS);

    return { consoleLines, documentLoads, ...(await probe(page)) };
  } finally {
    // Session boundary: sessionStorage dies here, the registration does not.
    await context.close();
  }
}

test.describe('service worker across a browser session boundary', () => {
  test('a returning session is not forced to reload', async ({ baseURL, request }, testInfo) => {
    // Needs a real generated service worker, i.e. a production build with
    // DISABLE_PWA unset/false. Under `next dev` the plugin is off and /sw.js
    // 404s, so there would be nothing for a cleanup to find and the test would
    // pass for the wrong reason.
    const swResponse = await request.get('/sw.js');
    test.skip(
      swResponse.status() !== 200,
      '/sw.js is not served: needs a production build with the PWA plugin enabled',
    );

    test.setTimeout(180_000);
    if (!baseURL) throw new Error('baseURL is not configured');
    const ipForSession = (session: number): string =>
      `10.231.${(testInfo.workerIndex + 1) % 256}.${session}`;
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
      expect(second.navigationType, `console: ${second.consoleLines.join(' | ')}`).toBe('navigate');
      expect(second.documentLoads, 'a forced reload shows up as a second document load').toBe(1);
      // The registration and the precache must survive the session boundary.
      expect(second.registrations).toBeGreaterThan(0);
      expect(second.cacheKeys.length).toBeGreaterThan(0);
    } finally {
      rmSync(profileDir, { recursive: true, force: true });
    }
  });
});
