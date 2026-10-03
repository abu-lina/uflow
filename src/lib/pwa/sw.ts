/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

import { runtimeCaching } from './runtimeCaching';
// Push notifications. This used to be `importScripts: ['/sw-push-handler.js']`;
// esbuild inlines it instead, so there is no second HTTP request for the worker
// to fetch (and no nginx no-cache rule for it to depend on).
// `scripts/verify-pwa-output.js` asserts the inlined behaviour survived.
import './sw-push-handler';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Substituted by esbuild at build time; see `injectionPoint` in serwist.config.js.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Parity with the @ducanh2912/next-pwa worker, which emitted
    // `precacheAndRoute(manifest, { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] })`
    // followed by `cleanupOutdatedCaches()`. Serwist defaults both off.
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
    cleanupOutdatedCaches: true,
  },
  // Was `workboxOptions.skipWaiting: true`. Serwist defaults this to false and
  // installs a SKIP_WAITING message listener instead, so it must be explicit.
  skipWaiting: true,
  // Parity: the previous worker called `clientsClaim()` unconditionally.
  clientsClaim: true,
  runtimeCaching,
  // Was `fallbacks: { document: '/offline.html' }`.
  //
  // `/offline.html` reaches the precache manifest through the `public/**/*` glob,
  // which serwist.config.js rewrites to `/offline.html`.
  //
  // Serwist attaches this as a `handlerDidError` plugin on every `runtimeCaching`
  // strategy that does not already have one, and `PrecacheFallbackPlugin` returns
  // `undefined` when nothing matches, which rethrows the original error. The old
  // next-pwa `self.fallback` returned `Response.error()` unconditionally, which is
  // what turned a failed generic fetch into "CORS request did not succeed" in
  // incident 046. The new behaviour is strictly better.
  //
  // WHAT MAKES THIS FIRE, and why that route must not be deleted: this entry is
  // only reachable through a runtime caching rule that handles a document
  // request, because Serwist attaches it as a `handlerDidError` plugin on the
  // strategies in `runtimeCaching`, not as a global navigation handler. The
  // images and js/css rules never see `request.destination === 'document'`.
  //
  // The same-origin document route at the end of
  // `src/lib/pwa/runtimeCaching.ts` (`({ request, sameOrigin }) => sameOrigin &&
  // request.destination === 'document'` -> `NetworkFirst`, `cacheName: 'pages'`)
  // is the one that does. Delete it and this `fallbacks` block goes silently
  // dead: `/offline.html` stays precached and still loads if requested directly,
  // but an offline navigation gets the browser's error page.
  // `scripts/verify-sw-no-cross-origin-routes.mjs` asserts that document
  // requests to both `/` and `/food` are intercepted, so that regression fails
  // the build.
  //
  // Scope: every same-origin navigation, not just `/`. The old
  // `@ducanh2912/next-pwa` behaviour (and the first cut of this migration)
  // covered `/` alone, so an offline user on `/food` got the browser error page.
  // Widened through runtime document caching rather than by re-enabling
  // `precachePrerendered`, which buys offline coverage by downloading 61 HTML
  // documents into every first-time visitor's cache on install.
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
}).addEventListeners();
