import { devices } from '@playwright/test';

import { expect, test } from './fixtures';

test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium' });

const now = Math.floor(Date.now() / 1000);
const jwt = (payload: object) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'FAKE-SIGNATURE-FOR-TESTING',
  ].join('.');

const user = {
  id: '00000000-0000-4000-8000-000000000551',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'repro-551@example.test',
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

const supabaseRef = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
).hostname.split('.')[0];
const storageKeys = Array.from(
  new Set([`sb-${supabaseRef}-auth-token`, 'sb-localhost-auth-token', 'sb-127-auth-token']),
);

test('Home nav link hit-tests to itself across its full mobile target', async ({ page }) => {
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
      localStorage.setItem('pwaPromptDismissed', Date.now().toString());
      localStorage.setItem('pwa_install_dismissed', 'true');
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

  const hitTest = await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav a')).find(
      (anchor) =>
        anchor.getAttribute('href') === '/' && getComputedStyle(anchor).visibility === 'visible',
    );
    if (!link) return { found: false as const, hits: [] };

    const rect = link.getBoundingClientRect();
    const hits = [0.1, 0.5, 0.9].flatMap((xRatio) =>
      [0.1, 0.5, 0.9].map((yRatio) => {
        const x = Math.floor(rect.left + rect.width * xRatio);
        const y = Math.floor(rect.top + rect.height * yRatio);
        const topmost = document.elementFromPoint(x, y);
        return {
          point: { x, y },
          topmost: topmost ? `${topmost.tagName}.${String(topmost.className).slice(0, 60)}` : 'none',
          hitsLink: topmost === link || (topmost !== null && link.contains(topmost)),
        };
      }),
    );
    return { found: true as const, hits };
  });

  expect(hitTest.found, 'expected a visible Home nav link').toBe(true);
  expect(
    hitTest.hits.filter((hit) => !hit.hitsLink),
    'every sampled point across the Home link target must hit the link or one of its children',
  ).toEqual([]);
});
