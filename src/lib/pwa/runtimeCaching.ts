import { CacheFirst, ExpirationPlugin, StaleWhileRevalidate, type RuntimeCaching } from 'serwist';

/**
 * The service worker's complete runtime caching list.
 *
 * Ported rule-by-rule from the `workboxOptions.runtimeCaching` array that
 * `@ducanh2912/next-pwa` used to consume (see the 282 migration). Two rules,
 * no more. Deliberately NOT built from `defaultCache`.
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
 * Both matchers stay `^`-anchored on purpose. `RegExpRoute` only accepts a
 * cross-origin match when it starts at index 0, so dropping the `^` would
 * silently stop these rules matching the very origins they exist for.
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
];
