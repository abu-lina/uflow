import { expect, test } from './fixtures';

/**
 * Issue 533 — soft 404s on dynamic segments.
 *
 * Unknown `/food/<city>`, `/food/<city>/<category>` and `/p/<id>` used to
 * return HTTP 200 with a not-found body, because the root `loading.tsx`
 * boundary flushes the shell (and the status line) before `notFound()` runs.
 * These specs assert the real wire status via `request.get()` — asserting on
 * "not found" copy would have passed for the entire lifetime of the bug.
 */
test.describe('issue 533 — HTTP status for unknown dynamic routes', () => {
  test('unknown /food/<city> returns 404', async ({ request }) => {
    const res = await request.get('/food/zzz-not-a-real-city-xyz123');
    expect(res.status()).toBe(404);
  });

  test('unknown /food/<city>/<category> returns 404', async ({ request }) => {
    const res = await request.get('/food/zzz-not-a-real-city-xyz123/also-fake');
    expect(res.status()).toBe(404);
  });

  test('unknown /p/<id> returns 404', async ({ request }) => {
    const res = await request.get('/p/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(404);
  });

  test('unknown /p/<id> no longer advertises index, follow', async ({ request }) => {
    // Before the fix this was the worst case in the repo: HTTP 200 plus the
    // root metadata's `index, follow` on a not-found body.
    const res = await request.get('/p/00000000-0000-0000-0000-000000000000');
    const body = await res.text();
    expect(body).not.toContain('content="index, follow"');
  });

  test('a path matching no route still returns 404', async ({ request }) => {
    // Guards the machinery that already worked from a regression.
    const res = await request.get('/this-route-does-not-exist-at-all');
    expect(res.status()).toBe(404);
  });

  test('/food index still returns 200', async ({ request }) => {
    const res = await request.get('/food');
    expect(res.status()).toBe(200);
  });

  test('valid /food/berlin still returns 200 and renders unchanged', async ({ page }) => {
    const res = await page.goto('/food/berlin', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);

    // The page actually renders, not just a status code: the route's
    // generateMetadata title and the app chrome must be on the wire.
    await expect(page).toHaveTitle('Halal Food in Berlin | Ummah Flow');
    await expect(page.locator('main, [role="main"], header, nav').first()).toBeVisible();
  });
});
