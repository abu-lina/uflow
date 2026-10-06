import { devices } from '@playwright/test';

import { expect, test } from './fixtures';

// Issue #126 — "Switching to profile menu on mobile sometimes doesn't work".
//
// Root cause: PWAInstallPrompt rendered an invisible full-screen backdrop
// (`fixed inset-0 z-[60]`, no pointer-events-none, no onClick) plus a card
// (`fixed bottom-4 z-[70]`) that overlapped the `z-50` mobile footer bar.
// Three seconds after load every tap on the bottom nav was swallowed by a
// layer that did nothing with it.
//
// Regression guard: with the prompt visible, the topmost element at the
// Profile nav link's own centre coordinates must be that link (or a
// descendant), and a real touch tap must navigate to /profile.
//
// Auth is seeded via localStorage and Supabase REST/auth calls are mocked,
// mirroring agent-output/artifacts/126-repro-minimised.mjs. Everything else
// (route, onboarding, city, splash) is held fixed so the only variable under
// test is the prompt's geometry.

// The suite's only project is chromium; the iPhone 13 descriptor defaults to
// webkit, so pin defaultBrowserType while keeping the viewport/UA/touch fields.
test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium' });

const now = Math.floor(Date.now() / 1000);

const jwt = (payload: object) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'FAKE-SIGNATURE-FOR-TESTING',
  ].join('.');

const user = {
  id: '00000000-0000-4000-8000-000000000126',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'repro-126@example.test',
  user_metadata: {},
  app_metadata: {},
  created_at: new Date().toISOString(),
};

const session = {
  access_token: jwt({ sub: user.id, role: 'authenticated', exp: now + 3600 }),
  refresh_token: 'FAKE-REFRESH-FOR-TESTING',
  expires_in: 3600,
  expires_at: now + 3600,
  token_type: 'bearer',
  user,
};

// supabase-js derives its storage key from the project ref (first hostname
// label): http://127.0.0.1:54321 -> sb-127-auth-token. Seed the key matching
// NEXT_PUBLIC_SUPABASE_URL plus the local-supabase variants so the spec works
// against either backend.
const supabaseRef = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
).hostname.split('.')[0];
const storageKeys = Array.from(
  new Set([`sb-${supabaseRef}-auth-token`, 'sb-localhost-auth-token', 'sb-127-auth-token']),
);

test.describe('PWA install prompt (mobile)', () => {
  test('does not intercept taps on the Profile nav link', async ({ page }) => {
    await page.addInitScript(
      ({ session, storageKeys }) => {
        localStorage.setItem('hasSeenSplashScreen', 'true');
        localStorage.setItem(
          'ummahflow_onboarding',
          JSON.stringify({
            email: 'r@e.test',
            waitlistSubmitted: true,
            earlyAccessUnlocked: true,
            submittedAt: new Date().toISOString(),
            waitlistToken: 'FAKE-TOKEN-FOR-TESTING',
          }),
        );
        localStorage.setItem('selectedCity', 'Berlin');
        // Deliberately NOT setting `pwaPromptDismissed`: the bug only bites
        // while the prompt is on screen.
        for (const key of storageKeys) {
          localStorage.setItem(key, JSON.stringify(session));
        }
      },
      { session, storageKeys },
    );

    await page.route(/\/auth\/v1\/(token|user)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(route.request().url().includes('/user') ? user : session),
      }),
    );
    await page.route(/\/rest\/v1\/rpc\/get_provider_count_by_city/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '42' }),
    );
    await page.route(/\/rest\/v1\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      }),
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The prompt fires 3s after load on iOS / installable devices.
    const prompt = page.getByRole('dialog', {
      name: /installationsanleitung öffnen|app installieren/i,
    });
    await expect(prompt).toBeVisible({ timeout: 15_000 });

    // Both bottom navs stay mounted; the inactive one is visibility:hidden.
    const hit = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('nav a')).find(
        (a) =>
          a.getAttribute('href') === '/profile' && getComputedStyle(a).visibility === 'visible',
      );
      if (!link) return { found: false as const };
      const rect = link.getBoundingClientRect();
      const x = Math.round(rect.x + rect.width / 2);
      const y = Math.round(rect.y + rect.height / 2);
      const top = document.elementFromPoint(x, y);
      return {
        found: true as const,
        point: { x, y },
        topmost: top ? `${top.tagName}.${String(top.className).slice(0, 60)}` : 'none',
        hitsLink: top === link || link.contains(top),
      };
    });

    expect(hit.found, 'expected a visible /profile nav link').toBe(true);
    if (!hit.found) return;
    expect(
      hit.hitsLink,
      `tap target blocked: topmost element at Profile link centre is ${hit.topmost}`,
    ).toBe(true);

    await page.touchscreen.tap(hit.point.x, hit.point.y);
    await expect(page).toHaveURL(/\/profile$/, { timeout: 10_000 });
  });
});
