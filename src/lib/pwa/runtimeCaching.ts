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
 * array that `@ducanh2912/next-pwa` used to consume, plus the start-url route
 * that library generated from its own `cacheStartUrl` default (see the 282
 * migration). Deliberately NOT built from `defaultCache`.
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
 * No matcher here may be a function. `defaultCache`'s cross-origin catch-all is
 * `({ sameOrigin }) => !sameOrigin`, and only a function matcher can express
 * that shape at all; an anchored RegExp or an exact path string cannot.
 * `src/__tests__/config/pwa-config.test.ts` enforces it structurally.
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
  // The start URL. DO NOT DELETE THIS AS "UNUSED": it is the only route that
  // ever sees a document request, and therefore the only thing that lets
  // `fallbacks: { entries: [{ url: '/offline.html', ... }] }` in sw.ts fire at
  // all. Serwist attaches the fallback as a `handlerDidError` plugin on the
  // runtime caching strategies; with no document-handling route, an offline
  // navigation never reaches a Serwist handler and the browser shows its own
  // error page instead of /offline.html.
  //
  // This is a restoration, not an addition. `@ducanh2912/next-pwa` generated
  // exactly this from its `cacheStartUrl` default (on by default, never
  // configured here) and emitted `registerRoute("/", new NetworkFirst({
  // cacheName: "start-url", ... }), "GET")`. It sat outside
  // `workboxOptions.runtimeCaching`, so the 282 port list missed it; request 282
  // restores parity deliberately.
  //
  // Parity means parity. A broader `request.destination === 'document'` route
  // would make the offline page work on /food and every other route, but that is
  // a behaviour change to navigation caching for the whole app, not a port. It is
  // logged as a follow-up instead.
  //
  // The matcher is the string `'/'`, same as next-pwa emitted. Serwist's
  // `parseRoute` turns a string into `new URL(capture, location.href)` plus an
  // exact `url.href === captureUrl.href` comparison, so it matches the scope
  // origin's `/` and nothing else: same-origin, exact, zero Iconify surface.
  {
    matcher: '/',
    handler: new NetworkFirst({ cacheName: 'start-url' }),
  },
];
