import { expect, test, type Page } from '@playwright/test';

import { TEST_EMAIL, TEST_PASSWORD } from './fixtures';

// i18n-safe handle on the authenticated user menu; the copy is translated,
// the aria-label is a fixed string in Header.tsx.
const PROFILE_MENU = 'button[aria-label="Profil Dropdown öffnen"]';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // The app redirects via a user-driven effect once auth state commits.
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 });
  await expect(page.locator(PROFILE_MENU)).toBeVisible({ timeout: 15_000 });
}

test.describe('authentication', () => {
  test('email/password login reaches an authenticated state', async ({ page, context }) => {
    await login(page);

    const cookieNames = (await context.cookies()).map((c) => c.name);
    expect(cookieNames.some((name) => name.startsWith('sb'))).toBe(true);
  });

  test('session survives a full page reload', async ({ page }) => {
    // Guards the @supabase/ssr cookie contract: a reload round-trips the
    // session through cookies, middleware and server rendering.
    await login(page);

    await page.reload();

    await expect(page.locator(PROFILE_MENU)).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).pathname).not.toBe('/login');

    // Server-side leg: the dashboard layout resolves auth through
    // getUserFromCookie (SSR cookie read + sb-access-token fallback). An
    // authenticated non-admin lands on /food. An anonymous user is sent to
    // /login and then bounced to /profile by client-side auth, so assert the
    // landing page itself rather than "not /login".
    await page.goto('/dashboard/enrichment');
    await page.waitForURL((url) => url.pathname !== '/dashboard/enrichment', {
      timeout: 15_000,
    });
    expect(new URL(page.url()).pathname).toBe('/food');
  });

  test('logout clears the session', async ({ page }) => {
    await login(page);

    await page.locator(PROFILE_MENU).click();
    await page.locator('button.text-danger').click();

    await expect(page.locator(PROFILE_MENU)).not.toBeVisible({ timeout: 15_000 });

    // A protected route must not render authenticated content afterwards.
    await page.goto('/profile');
    await page.waitForURL('**/login**', { timeout: 15_000 });
  });
});
