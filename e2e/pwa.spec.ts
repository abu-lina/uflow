import { expect, test } from './fixtures';

test.describe('PWA service worker', () => {
  // The worker is built by `serwist build` after `next build`, so it only
  // exists where a real build is served (CI=1 -> `npm run start`). Under
  // `npm run dev` nothing generates it and /sw.js 404s.
  test.skip(!process.env.CI, 'service worker is only generated in production builds');

  test('sw.js is served and carries the push handler', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
    const body = await response.text();
    // Serwist bundles src/lib/pwa/sw-push-handler.js with esbuild rather than
    // importScripts-ing it, so the filename is gone from the output and only
    // its behaviour remains. Same markers as scripts/verify-pwa-output.js;
    // esbuild normalises string literals to double quotes.
    expect(body).toContain('addEventListener("push"');
    expect(body).toContain('showNotification');
    expect(body).toContain('UFLOW');
  });
});
