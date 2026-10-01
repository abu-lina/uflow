import { expect, test } from './fixtures';

test.describe('PWA service worker', () => {
  // next-pwa only generates the service worker in a production build; under
  // `npm run dev` the plugin is disabled and /sw.js 404s, so this spec must
  // only run where a real build is served (CI=1 -> `npm run start`).
  test.skip(!process.env.CI, 'service worker is only generated in production builds');

  // Guards the webpack-dependent SW generation in next.config.js: if the
  // bundler silently switched to Turbopack, /sw.js would 404 or lose the
  // push-handler importScripts entry.
  test('sw.js is served and imports the push handler', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('sw-push-handler.js');
  });
});
