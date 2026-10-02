import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  StaleWhileRevalidate,
  type RuntimeCaching,
} from 'serwist';

/**
 * The service worker's complete runtime caching list.
 *
 * Three rules, no more: the two ported from the `workboxOptions.runtimeCaching`
 * array that `@ducanh2912/next-pwa` used to consume, plus the same-origin
 * document route that replaces (and subsumes) the start-url route that library
 * generated from its own `cacheStartUrl` default (see the 282 migration).
 * Deliberately NOT built from `defaultCache`.
 *
 * ## Do not import `defaultCache` from `@serwist/next/worker`
 *
 * Its production branch ends with two catch-alls that both match every
 * cross-origin request:
 *
 *   { matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkFirst({ cacheName: "cross-origin", ... }) }
 *   { matcher: <a bare dot-star regex>, method: "GET", handler: new NetworkOnly() }
 *
 * The first is byte-identical (down to `maxEntries: 32` and
 * `networkTimeoutSeconds: 10`) to the `@ducanh2912/next-pwa` default-cache
 * route that caused incident 046; the second is the same interception that
 * caused the 064/069 hotfix. In a non-production build `defaultCache` collapses
 * to that single dot-star NetworkOnly on its own, and `@serwist/cli` sets
 * `NODE_ENV=development` whenever `--watch` is passed, so even a "just for dev"
 * import is the maximally hostile version.
 *
 * ## Why there is no route for the Iconify CDN APIs
 *
 * There is deliberately NO entry for `api.iconify.design`, `api.unisvg.com` or
 * `api.simplesvg.com`. A `NetworkOnly` route was tried once as a safety net and
 * made things worse: a registered route means the service worker calls
 * `event.respondWith()` and re-issues the request from the service-worker
 * context, and that re-issued request behaved differently enough to stop icons
 * loading on `/p/[id]` ("no-response :: error:{}", status null) while the exact
 * same request succeeded when the browser made it directly.
 *
 * (The earlier write-ups attributed that to Firefox Enhanced Tracking
 * Protection. That specific attribution is unverified: the three domains appear
 * on none of the lists ETP classifies by, and a Playwright Firefox 155
 * reproduction returned 200 with ETP both on and off. The *rule* below still
 * holds and is what is guarded; only the stated mechanism was folklore. See
 * agent-output/research/282-defaultcache-iconify.md.)
 *
 * The property the app depends on is narrow and testable: when no route
 * matches, Serwist never calls `event.respondWith()` at all
 * (`serwist/src/Serwist.ts` `handleFetch`), so the browser handles those
 * requests natively. `scripts/verify-sw-no-cross-origin-routes.mjs` asserts
 * exactly that against the built `public/sw.js` on every build.
 *
 * See: agent-output/analysis/closed/046-iconify-pwa-analysis.md
 *      agent-output/retrospectives/closed/064-iconify-sw-cors-fix-retrospective.md
 *      agent-output/research/282-defaultcache-iconify.md
 *
 * Both RegExp matchers stay `^`-anchored on purpose. `RegExpRoute` only accepts
 * a cross-origin match when it starts at index 0, so dropping the `^` would
 * silently stop these rules matching the very origins they exist for.
 *
 * The invariant every matcher here must satisfy is behavioural, not syntactic:
 * it must evaluate to FALSE for a cross-origin request to the three Iconify
 * origins. That is what `src/__tests__/config/pwa-config.test.ts` asserts, by
 * evaluating each matcher (function matchers included) against those URLs. It
 * replaced an older blanket "no function matchers" ban, which excluded
 * `defaultCache`'s `({ sameOrigin }) => !sameOrigin` only by accident of shape
 * and also excluded the `sameOrigin && destination === 'document'` route below.
 * The behavioural check is strictly stronger: `!sameOrigin` returns true for
 * Iconify and is rejected; `sameOrigin && ...` returns false and is allowed.
 */
export const runtimeCaching: RuntimeCaching[] = [
  // Cross-origin image assets (e.g. Supabase Storage provider photos).
  // Do NOT add Supabase API calls here — only static image assets.
  {
    matcher: /^https:\/\/[^/]*\.supabase\.co\/.*\.(?:png|jpg|jpeg|svg|gif)(\?.*)?$/,
    handler: new CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    }),
  },
  {
    matcher: /^https:\/\/.*\.(?:js|css)$/,
    handler: new StaleWhileRevalidate({
      cacheName: 'static-resources',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    }),
  },
  // Same-origin documents. DO NOT DELETE THIS AS "UNUSED": it is the only route
  // that ever sees a document request, and therefore the only thing that lets
  // `fallbacks: { entries: [{ url: '/offline.html', ... }] }` in sw.ts fire at
  // all. Serwist attaches the fallback as a `handlerDidError` plugin on the
  // runtime caching strategies; with no document-handling route, an offline
  // navigation never reaches a Serwist handler and the browser shows its own
  // error page instead of /offline.html.
  //
  // It replaces, and subsumes, the `matcher: '/'` -> `NetworkFirst('start-url')`
  // route that `@ducanh2912/next-pwa` generated from its `cacheStartUrl` default:
  // `/` is a document request, so it still goes through here. The widening is
  // deliberate and chosen over the alternative. `@serwist/next` defaults
  // `precachePrerendered: true`, which would cover more pages offline by
  // downloading all 61 prerendered HTML documents into every first-time
  // visitor's cache on install; that is what took middleware-counted install
  // requests from 54 to 112 and left the worker stuck `installing`. Caching
  // documents at RUNTIME gives offline coverage of the pages a user actually
  // visited, at zero install cost. `precachePrerendered` stays false.
  //
  // Scoped to `sameOrigin` so it cannot touch a cross-origin document, which
  // keeps the Iconify property above intact: this matcher returns FALSE for
  // api.iconify.design, which is the shape
  // `src/__tests__/config/pwa-config.test.ts` asserts (it evaluates every
  // matcher against those three origins rather than banning function matchers,
  // which is what rules out `defaultCache`'s `({ sameOrigin }) => !sameOrigin`
  // while allowing this).
  //
  // `networkTimeoutSeconds: 10` so a dead-slow network falls back to the cached
  // copy instead of hanging; `ExpirationPlugin` caps the cache at 50 pages / 7
  // days so a long browsing session cannot grow it without bound.
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
    handler: new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 10,
      plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 })],
    }),
  },
];
