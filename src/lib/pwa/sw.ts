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
  // KNOWN GAP, see agent-output/requests/282-serwist-migration.md: neither of the
  // two runtime caching rules ever handles a document request, so this entry
  // cannot currently fire. The route that used to make it fire was next-pwa's
  // `cacheStartUrl` default (`registerRoute("/", new NetworkFirst({ cacheName:
  // "start-url" }))`), which is not part of `workboxOptions.runtimeCaching` and
  // was therefore not in the port list.
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
}).addEventListeners();
