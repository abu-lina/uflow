---
ID: 046
Origin: 046
UUID: 3a7f1c2e
Status: Planned
---

# 046 — Iconify Icon CDN Fetch Intercepted by ServiceWorker (PWA)

**Changelog**

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 | 2026-03-19 | Analyst | Initial analysis — root cause verified via source trace |
| 1.1 | 2026-03-19 | Planner | Planning handoff completed; analysis closed in favor of Plan 046 |

---

## Value Statement and Business Objective

Provider detail pages (e.g., `ummahflow.com/providers/[id]`) display contextual icons that help users quickly identify social, contact, and share actions. When these icons fail to render, the page appears broken, degrading perceived quality and trust for providers like "Café Blüte, Stuttgart". The business objective is to restore reliable icon rendering in the PWA context without disabling the service worker.

---

## Scope

- **Primary file**: `next.config.js` — `withPWA` Workbox configuration
- **Affected icons**: `lucide:share-2`, `mdi:instagram`, `mdi:internet`, `entypo:old-phone`
- **Affected components**: `ProviderDetailPage.tsx`, `ProviderActionBar.tsx`, `ProfileProviderDetailButtons.tsx`
- **CDN endpoints targeted**: `api.iconify.design`, `api.unisvg.com`, `api.simplesvg.com`
- **Library stack**: `@ducanh2912/next-pwa@10.2.9` + `workbox-webpack-plugin@7.1.0` + `workbox-build@7.1.1`

---

## Methodology

1. Read full `next.config.js` — mapped all withPWA options and runtimeCaching entries
2. Read `@ducanh2912/next-pwa` v10 source from GitHub:
   - `src/context.ts` — option destructuring and normalisation
   - `src/cache.ts` — default runtime-caching array
   - `src/resolve-runtime-caching.ts` — cache merge/selection logic
   - `src/resolve-workbox-plugin.ts` — plugin assembly including `handlerDidError`
   - `src/fallback.ts` — the `self.fallback` implementation
3. Traced icon component tree to confirm the three failing CDN fetch URLs
4. Verified CSP `connect-src` directive against the failing origins
5. Checked `public/sw-push-handler.js` for interfering fetch listeners

---

## Findings

### F-01 ✅ VERIFIED — Root Cause: `runtimeCaching` placed at wrong API level

`@ducanh2912/next-pwa@10.x` introduced a breaking API change from `shadowwalker/next-pwa`. Workbox-specific options (`runtimeCaching`, `importScripts`, `skipWaiting`, `buildExcludes`) must be nested under `workboxOptions`. The current `next.config.js` passes them at the **top level**.

**Evidence from `src/context.ts`** (library source):

```typescript
let {
  disable = false,
  register = true,
  dest = "public",
  sw = "sw.js",
  // ... PluginOptions only
  workboxOptions: {
    additionalManifestEntries,
    manifestTransforms: _manifestTransforms = [],
    exclude: _exclude = [...],
    ...workbox            // all other workboxOptions here, including runtimeCaching
  } = {},
  extendDefaultRuntimeCaching = false,
} = userOptions;
```

`runtimeCaching` is NOT destructured from `userOptions` at the top level. It only reaches the plugin if supplied as `workboxOptions.runtimeCaching`. The current config:

```javascript
// next.config.js (CURRENT — WRONG level for v10)
const withPWA = require('@ducanh2912/next-pwa').default({
  runtimeCaching: [ ... ],   // ← IGNORED by @ducanh2912/next-pwa@10.x
  importScripts: [ ... ],    // ← IGNORED
  skipWaiting: true,         // ← IGNORED (default is true anyway)
  buildExcludes: [ ... ],    // ← IGNORED
});
```

### F-02 ✅ VERIFIED — Default Cache Activates `!sameOrigin` NetworkFirst Catch-all

**Evidence from `src/resolve-runtime-caching.ts`**:

```typescript
export const resolveRuntimeCaching = (
  userSpecifiedRuntimeCaching: RuntimeCaching[] | undefined,
  shouldExtendDefaultCache: boolean
) => {
  if (!userSpecifiedRuntimeCaching) {
    return defaultCache;           // ← DEFAULT cache used when runtimeCaching is undefined
  }
  if (!shouldExtendDefaultCache) {
    return userSpecifiedRuntimeCaching;  // ← custom cache replaces default
  }
  // ...merge logic
};
```

Because the top-level `runtimeCaching` is silently ignored, `userSpecifiedRuntimeCaching` is `undefined`, and `resolveRuntimeCaching` falls into the **first branch — meaning the full default cache from `src/cache.ts` becomes active**:

```javascript
// src/cache.ts — DEFAULT cache (active because user's runtimeCaching is ignored)
{
  urlPattern: /\.(?:json|xml|csv)$/i,   // matches *.json paths
  handler: "NetworkFirst",
  options: { cacheName: "static-data-assets", ... },
},
// ... and most critically:
{
  urlPattern: ({ sameOrigin }) => !sameOrigin,  // ← ALL cross-origin requests
  handler: "NetworkFirst",
  options: {
    cacheName: "cross-origin",
    expiration: { maxEntries: 32, maxAgeSeconds: 3600 },
    networkTimeoutSeconds: 10,
  },
},
```

The `!sameOrigin` route **matches every Iconify CDN API request** (`api.iconify.design`, `api.unisvg.com`, `api.simplesvg.com` are all cross-origin from `ummahflow.com`).

### F-03 ✅ VERIFIED — `fallbacks` config injects `handlerDidError` → `Response.error()` for API fetch events

**Evidence from `src/resolve-workbox-plugin.ts`**:

```typescript
if (hasFallbacks) {                      // ← true because fallbacks.document is set
  runtimeCaching.forEach((cacheEntry) => {
    cacheEntry.options.plugins.push({
      async handlerDidError({ request }) {
        if (typeof self !== "undefined") {
          return self.fallback(request);  // ← called when NetworkFirst throws
        }
        return Response.error();
      },
    });
  });
}
```

**Evidence from `src/fallback.ts`**:

```javascript
self.fallback = async (request) => {
  const { destination, url } = request;
  const fallbackUrl = {
    document: process.env.__PWA_FALLBACK_DOCUMENT__,   // '/offline.html'
    image: process.env.__PWA_FALLBACK_IMAGE__,         // undefined
    // ...
  };
  const fallbackResponse = fallbackUrl[destination];
  if (fallbackResponse) {
    return caches.match(fallbackResponse, { ignoreSearch: true });
  }
  // For Iconify API calls: destination === "" (plain fetch/XHR)
  // No __PWA_FALLBACK_DATA__ configured
  // URL does NOT match /_next/data/ pattern
  return Response.error();   // ← RETURNED for all API/XHR requests
};
```

For Iconify API fetch requests:
- `request.destination === ""` (generic fetch/XHR, not 'document' / 'image')
- No data fallback configured
- URL pattern (`/_next/data/`) does not match
- **`Response.error()` is returned unconditionally**

### F-04 ✅ VERIFIED — Failure chain

```
Page renders ProviderDetailPage
  ↓
@iconify/react issues fetch: GET https://api.iconify.design/lucide.json?icons=share-2
  ↓
SW intercepts (active default cache — !sameOrigin NetworkFirst route matches)
  ↓
event.respondWith(NetworkFirst.handle(request))
  ↓
NetworkFirst: fetch(event.request) from SW context
  ↓
Fetch succeeds OR fails:
  Case A (success, fresh): response is fetched & cached → icons render
  Case B (cache expired or network error): cache miss + network error
    → handlerDidError invoked
    → self.fallback(request) called
    → destination === "" → Response.error()
    → event.respondWith(Response.error())
    → Browser: "ServiceWorker passed an Error Response to FetchEvent.respondWith()"
    → "CORS request did not succeed (status null)"
```

**Root cause for consistent failure**: the `cross-origin` cache expires after 1 hour (`maxAgeSeconds: 3600`) and holds only 32 entries (shared across ALL cross-origin requests app-wide). Cache eviction + expiry means Iconify icon fetches regularly miss cache, triggering the error path.

### F-05 ✅ VERIFIED — CSP is NOT the cause

The `connect-src` directive in `buildCsp()` explicitly whitelists all three Iconify fallback CDNs:

```javascript
'connect-src',
  "'self'",
  'https://api.iconify.design',    // ← present
  'https://api.unisvg.com',        // ← present
  'https://api.simplesvg.com',     // ← present
  ...
```

And `default-src` also includes them. CSP is not blocking these requests.

### F-06 ✅ VERIFIED — `importScripts` also at wrong level (secondary regression)

`importScripts: ['/sw-push-handler.js']` is at the top level and is also silently ignored. The push notification handler is **NOT imported into the generated service worker**. This is a secondary regression that does not affect icon rendering.

### F-07 ✅ VERIFIED — `buildExcludes` at wrong level (secondary regression)

`buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/]` is at the top level and maps to the `exclude` option inside `workboxOptions` in the new API. The library's default `exclude` array does not include these patterns, meaning Next.js internal manifest files may be inadvertently precached. This is a secondary regression.

### F-08 — `sw-push-handler.js` does NOT add fetch listeners

Verified: `public/sw-push-handler.js` only registers `push` and `notificationclick` event listeners. It does not interfere with fetch events.

### F-09 — `entypo:old-phone` icon also affected

`ProviderDetailPage.tsx` and `ProviderActionBar.tsx` use `icon="entypo:old-phone"`. This triggers a fetch to `https://api.iconify.design/entypo.json?icons=old-phone`, which falls under the same cross-origin catch-all route and is similarly affected.

---

## Root Cause (Verified)

**The `withPWA(...)` configuration in `next.config.js` uses the API structure from `shadowwalker/next-pwa` (pre-v10), but the installed library is `@ducanh2912/next-pwa@10.2.9` which reorganised Workbox-specific options under a `workboxOptions` namespace.**

As a result:
1. The user-provided `runtimeCaching` array is silently ignored
2. The library activates its built-in **default cache**, which includes a `!sameOrigin` NetworkFirst catch-all intercepting ALL cross-origin requests
3. Combined with the `fallbacks.document` config, a `handlerDidError` plugin is injected into every cache entry. For non-document XHR/fetch requests (like Iconify API calls), this plugin unconditionally returns `Response.error()`
4. When the `NetworkFirst` strategy fails (cache expiry at 1h + misses under the 32-entry limit), the error path fires and `Response.error()` is passed to `FetchEvent.respondWith()`, producing the CORS error the browser reports

---

## System Weaknesses

| # | Layer | Weakness | Risk Mechanism |
|---|---|---|---|
| W-1 | Config | No TypeScript / JSDoc validation on top-level `withPWA` options | Silent option misplacement; breaking changes in library API go undetected at build time |
| W-2 | PWA | Default cache (`!sameOrigin` NetworkFirst) is too broad for a production app with external APIs | Any cross-origin API call is intercepted; failures produce opaque `Response.error()` |
| W-3 | PWA | `fallbacks` `handlerDidError` returns `Response.error()` for all non-document failures | API fetches are silently killed instead of being passed through to the network |
| W-4 | CI/CD | No integration test covers icon rendering in PWA/offline context | The regression was not caught before deployment |
| W-5 | Config | `buildExcludes` / `importScripts` at wrong level silently ignored | Push notifications may not work; manifest files may be incorrectly precached |

---

## Instrumentation Gaps

| Gap | Type | Recommended Signal |
|---|---|---|
| No logging of SW route matches | Normal | Log `[SW] route matched: ${cacheName} for ${request.url}` on each route resolution |
| No error-boundary for Iconify failures | Normal | Wrap icon API errors at the React level; surface "icon unavailable" state |
| No SW version / cache-hit metrics | Normal | Add structured log in `handlerDidError` indicating which cache entry fired and the request URL |
| `@iconify/react` fetch errors are silent | Debug | Intercept Iconify error events to send structured error reporting |

---

## Analysis Recommendations (Next Steps)

1. **Fix the `withPWA` config structure** — migrate `runtimeCaching`, `importScripts`, `skipWaiting`, `buildExcludes` (→ `exclude`) into `workboxOptions`. This immediately narrows the active cache to the explicitly declared routes and removes the `!sameOrigin` catch-all.

2. **Add explicit `NetworkOnly` for Iconify CDN in `workboxOptions.runtimeCaching`** — this ensures the SW never intercepts, caches, or errors-on Iconify API fetches regardless of fallback configuration:
   ```javascript
   {
     urlPattern: /^https:\/\/(api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\//,
     handler: 'NetworkOnly',
   }
   ```
   This is the defence-in-depth fix that protects Iconify even if the catch-all is re-enabled.

3. **Verify `importScripts` is passing the push handler** — once `importScripts` moves to `workboxOptions`, confirm the push handler is imported in the generated SW by inspecting `public/sw.js` after build.

4. **Verify `buildExcludes`** — migrate to `workboxOptions.exclude` with the correct Workbox regex format.

5. **Add a Playwright / Vitest-browser test** that loads `providers/[id]` with the SW registered and asserts icon elements are visible.

---

## Open Questions

| # | Question | Resolution Path |
|---|---|---|
| Q-1 | Does `@ducanh2912/next-pwa@10.2.9` warn in the build log when unrecognised top-level options are supplied? | Check build output with verbose logging after installing node_modules |
| Q-2 | Was push notification delivery already broken before this analysis (due to `importScripts` at wrong level)? | Confirm by checking if `sw-push-handler.js` is present in the generated `public/sw.js` file after build |
| Q-3 | Are there other cross-origin API endpoints affected by the `!sameOrigin` default route? | Audit all external `fetch()` calls app-wide against the `!sameOrigin` intercept |
