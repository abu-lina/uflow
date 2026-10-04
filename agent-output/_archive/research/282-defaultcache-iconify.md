---
Request: 282
Phase: Research (Phase 1 — settle the defaultCache / Iconify question)
Branch: refactor/282-serwist-migration
Researched: 2026-10-02 (UTC)
Scope: INVESTIGATION ONLY. No change to next.config.js, package.json, package-lock.json,
  build scripts, or any source file in this worktree. Packages were inspected via `npm pack`
  into /tmp/serwist-inspect and exercised in a throwaway project at /tmp/sw-probe.
---

# Serwist `defaultCache` vs the Iconify CDN: can we adopt it?

## Q1 answer, one line

**No. `@serwist/next@9.5.12`'s `defaultCache` registers TWO routes that match cross-origin Iconify
requests: a `({ sameOrigin }) => !sameOrigin` NetworkFirst `"cross-origin"` route and a trailing
`/.*/i` NetworkOnly GET catch-all. The first is byte-for-byte the same route that caused incident
046; the second is the same NetworkOnly interception that caused the 064/069 hotfix.**

## Verdict on `defaultCache`

**STOP.** Do not import `defaultCache` in `app/sw.ts`, not even "and then filter it". Port the two
runtime caching rules by hand, as the request already instructed. Rationale is in Q1; the two
offending entries are not removable by configuration because `defaultCache` is a plain exported
array constant with no options.

Nuance worth knowing (it does not change the verdict): Serwist's `fallbacks` mechanism is
**materially safer** than `@ducanh2912/next-pwa`'s. Serwist's `PrecacheFallbackPlugin.handlerDidError`
returns `undefined` when no fallback entry matches, which rethrows the original error, whereas
next-pwa's `self.fallback` returned `Response.error()` unconditionally (finding F-03 in analysis 046).
So the *specific* "CORS request did not succeed (status null)" signature from 046 would not reproduce
identically. But the interception itself still happens, and interception is what broke Iconify in
064/069. Treat the fallbacks difference as a reason the symptom might be *different*, not a reason it
is safe.

Everything below is marked **VERIFIED** (with source) or **INFERRED**. Things I could not establish
are in the final section, including one finding that **contradicts the repo's own stated root cause
for the 064 regression**.

---

## How the packages were inspected

**VERIFIED.** `npm pack serwist@9.5.12 @serwist/next@9.5.12 @serwist/cli@9.5.12 @serwist/build@9.5.12
@serwist/utils@9.5.12` into `/tmp/serwist-inspect`, extracted and read. `serwist` and `@serwist/next`
ship their `src/` in the tarball (`"files": ["src", "dist"]`), so the quotes below are the real
upstream TypeScript, cross-checked against the shipped `dist/*.mjs`.

A second throwaway project at `/tmp/sw-probe` installed `serwist@9.5.12 @serwist/cli@9.5.12
@serwist/next@9.5.12 esbuild@0.28.1 playwright@1.63.0` and actually ran `serwist build` four times
plus three Playwright probes. **This worktree's `package.json` and `package-lock.json` were not
touched and no `node_modules` was created in the worktree** (`git status --short` is clean; see
"Changes made" at the end). `npx playwright install firefox` and `npx playwright install chromium`
did download into the shared `~/Library/Caches/ms-playwright` browser cache (firefox-1543,
chromium-1193); that is a machine-level browser cache, not a project dependency.

---

## Q1. Does `defaultCache` register a route matching cross-origin Iconify requests?

**VERIFIED. Yes, two of them, plus a third that is safe only by accident.**

`defaultCache` is exported from **`@serwist/next/worker`** (`exports["./worker"]` →
`dist/index.worker.mjs`; source `src/index.worker.ts`). It is **not** exported from `serwist` itself.
It is a plain `RuntimeCaching[]` constant with a dev/prod ternary:

```ts
// @serwist/next@9.5.12 — src/index.worker.ts:17-23
export const defaultCache: RuntimeCaching[] =
  process.env.NODE_ENV !== "production"
    ? [
        {
          matcher: /.*/i,
          handler: new NetworkOnly(),
        },
      ]
    : [ /* 18 entries, enumerated below */ ];
```

### The production branch, entry by entry

Order matters: Serwist registers routes in array order and `findMatchingRoute` returns the **first**
match (`serwist@9.5.12 src/Serwist.ts:610-611`, "Give precedence to all of the earlier routes by
adding this additional route to the end of the array").

| # | `matcher` | handler / cacheName | Matches cross-origin Iconify? |
| --- | --- | --- | --- |
| 1 | `/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i` | CacheFirst `google-fonts-webfonts` | No |
| 2 | `/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i` | StaleWhileRevalidate `google-fonts-stylesheets` | No |
| 3 | `/\.(?:eot\|otf\|ttc\|ttf\|woff\|woff2\|font.css)$/i` | StaleWhileRevalidate `static-font-assets` | No (unanchored, see note A) |
| 4 | `/\.(?:jpg\|jpeg\|gif\|png\|svg\|ico\|webp)$/i` | StaleWhileRevalidate `static-image-assets` | No (unanchored, note A) |
| 5 | `/\/_next\/static.+\.js$/i` | CacheFirst `next-static-js-assets` | No |
| 6 | `/\/_next\/image\?url=.+$/i` | StaleWhileRevalidate `next-image` | No |
| 7 | `/\.(?:mp3\|wav\|ogg)$/i` | CacheFirst `static-audio-assets` | No |
| 8 | `/\.(?:mp4\|webm)$/i` | CacheFirst `static-video-assets` | No |
| 9 | `/\.(?:js)$/i` | StaleWhileRevalidate `static-js-assets` | No (unanchored, note A) |
| 10 | `/\.(?:css\|less)$/i` | StaleWhileRevalidate `static-style-assets` | No (unanchored, note A) |
| 11 | `/\/_next\/data\/.+\/.+\.json$/i` | NetworkFirst `next-data` | No |
| 12 | `/\.(?:json\|xml\|csv)$/i` | NetworkFirst `static-data-assets` | **No, but only by accident — see note A. This is the closest call in the whole array.** |
| 13 | `/\/api\/auth\/.*/` | NetworkOnly | No (unanchored, note A) |
| 14 | `({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/")` | NetworkFirst `apis`, GET | No (`sameOrigin` guard) |
| 15 | `({ request, url: { pathname }, sameOrigin }) => RSC===1 && Next-Router-Prefetch===1 && sameOrigin && !/api/` | NetworkFirst `pages-rsc-prefetch` | No |
| 16 | `({ request, url: { pathname }, sameOrigin }) => RSC===1 && sameOrigin && !/api/` | NetworkFirst `pages-rsc` | No |
| 17 | `({ request, url: { pathname }, sameOrigin }) => Content-Type includes text/html && sameOrigin && !/api/` | NetworkFirst `pages` | No |
| 18 | `({ url: { pathname }, sameOrigin }) => sameOrigin && !pathname.startsWith("/api/")` | NetworkFirst `others` | No |
| **19** | **`({ sameOrigin }) => !sameOrigin`** | **NetworkFirst `cross-origin`, maxEntries 32, maxAgeSeconds 3600, networkTimeoutSeconds 10** | **YES — this is the 046 route** |
| **20** | **`/.*/i`, `method: "GET"`** | **NetworkOnly** | **YES — this is the 064/069 failure pattern** |

The two problem entries, quoted verbatim from `@serwist/next@9.5.12 src/index.worker.ts:239-262`:

```ts
        {
          matcher: ({ sameOrigin }) => !sameOrigin,
          handler: new NetworkFirst({
            cacheName: "cross-origin",
            plugins: [
              new ExpirationPlugin({
                maxEntries: 32,
                maxAgeSeconds: 60 * 60, // 1 hour
              }),
            ],
            networkTimeoutSeconds: 10,
          }),
        },
        {
          matcher: /.*/i,
          method: "GET",
          handler: new NetworkOnly(),
        },
```

Compare against analysis 046 finding F-02, which quoted `@ducanh2912/next-pwa`'s `src/cache.ts`:
`urlPattern: ({ sameOrigin }) => !sameOrigin`, `handler: "NetworkFirst"`, `cacheName: "cross-origin"`,
`maxEntries: 32`, `maxAgeSeconds: 3600`, `networkTimeoutSeconds: 10`. **Identical, including the
constants.** Serwist is a Workbox fork by the same author; this array was carried over.

Same-origin never reaches entry 19 or 20 in practice (entry 18 catches it), so entries 19 and 20
exist precisely to handle cross-origin traffic. Entry 20 catches anything entry 19 misses, e.g. a
cross-origin request that somehow bypasses entry 19 — and NetworkOnly re-issues `fetch()` from the
service-worker context, which is the exact mechanism retrospective 064 blames.

**Note A — why the `$`-anchored regexes are safe cross-origin, and why that is fragile.**
Serwist tests a `RegExp` matcher against **`url.href`**, and for cross-origin URLs it additionally
requires the match to start at index 0:

```ts
// serwist@9.5.12 — src/RegExpRoute.ts:43-63
const match: RouteMatchCallback = ({ url }: RouteMatchCallbackOptions) => {
  const result = regExp.exec(url.href);
  if (!result) return;
  // Require that the match start at the first character in the URL string
  // if it's a cross-origin request.
  if (url.origin !== location.origin && result.index !== 0) {
    ...
    return;
  }
  return result.slice(1);
};
```

So `/\.(?:json|xml|csv)$/i` (entry 12) cannot match a cross-origin URL at all, because the match
index would be at the `.json`, never 0. That is the *only* thing stopping entry 12 from catching
`https://api.iconify.design/lucide.json` — and note the actual Iconify request is
`https://api.iconify.design/lucide.json?icons=share-2`, so the `$` anchor fails too. Two independent
accidents. **Do not rely on this.** The same index-0 rule is why the repo's existing
`^https://...supabase.co/...` rule works (it is `^`-anchored) and why a naive
`/\.(?:png|jpg)$/`-style rewrite of that rule would silently stop matching Supabase images.

### The dev branch is worse

**VERIFIED by building it.** In a non-production build, `defaultCache` collapses to a single
`/.*/i` NetworkOnly route. I built `sw-default.ts` (which does `runtimeCaching: defaultCache`) with
`NODE_ENV=development serwist build` and read the unminified output:

```js
// /tmp/sw-probe/public/sw-dev.js
defaultCache = true ? [{
  matcher: /.*/i,
  handler: new NetworkOnly()
}] : [ ... ]
```

A dev/watch worker built with `defaultCache` would intercept and re-issue **every** GET from the
SW context, which is the maximally hostile version of the 064 failure. Relevant because the
configurator-mode docs recommend `concurrently -p none 'serwist build --watch' 'next dev'`
(<https://serwist.pages.dev/docs/next/config>, Step 2), and `@serwist/cli`'s entry point defaults
`NODE_ENV` to `"development"` when `--watch` is passed:

```js
// @serwist/cli@9.5.12 — dist/bin.mjs:143-144
process.env.SERWIST_ENV = params.flags.watch ? "watch" : "build";
if (!process.env.NODE_ENV) process.env.NODE_ENV = params.flags.watch ? "development" : "production";
```

### Which entries are the problem, stated plainly

- **Entry 19**, `matcher: ({ sameOrigin }) => !sameOrigin` → NetworkFirst `"cross-origin"`.
- **Entry 20**, `matcher: /.*/i, method: "GET"` → NetworkOnly.
- **The entire dev branch**, `matcher: /.*/i` → NetworkOnly.
- **Entry 12**, `/\.(?:json|xml|csv)$/i` → NetworkFirst `"static-data-assets"`: safe today only
  because of `RegExpRoute`'s index-0 rule plus the `?icons=` query string. Flag it; do not copy it.

### The good news, and it is load-bearing

**VERIFIED.** When no route matches, Serwist **does not call `respondWith` at all**, so the browser
handles the request natively. This is exactly the property `next.config.js:42-44` depends on, and it
survives the migration:

```ts
// serwist@9.5.12 — src/Serwist.ts:472-478
handleFetch(event: FetchEvent) {
  const { request } = event;
  const responsePromise = this.handleRequest({ request, event });
  if (responsePromise) {
    event.respondWith(responsePromise);
  }
}
```

```ts
// serwist@9.5.12 — src/Serwist.ts:795-801 (inside handleRequest)
    if (!handler) {
      ...
      return;   // → handleFetch skips respondWith entirely
    }
```

And Serwist's `fallbacks` injection, unlike next-pwa's, cannot manufacture an error response:

```ts
// serwist@9.5.12 — src/lib/precaching/PrecacheFallbackPlugin.ts:63-78
  async handlerDidError(param: HandlerDidErrorCallbackParam) {
    for (const fallback of this._fallbackUrls) { ... }
    return undefined;        // ← next-pwa returned Response.error() here
  }
```

```ts
// serwist@9.5.12 — src/lib/strategies/Strategy.ts:138-148
        for (const callback of handler.iterateCallbacks("handlerDidError")) {
          response = await callback({ error, event, request });
          if (response !== undefined) break;
        }
      }
      if (!response) {
        throw error;         // original error propagates, no Response.error()
      }
```

One carry-over hazard to keep in mind: `fallbacks` still **mutates** `runtimeCaching`, pushing the
plugin into every strategy that does not already have a `handlerDidError`
(`src/Serwist.ts:231-245`). So the "fallbacks touch every route" shape from 046 is preserved; only
the error-path behaviour differs.

---

## Q2. Configurator-mode config surface, and the option-by-option mapping

### What the surface actually is

**VERIFIED.** Configurator mode is `serwist.config.js` → `export default serwist({...})` from
`@serwist/next/config`, consumed by `serwist build`. The option type is:

```ts
// @serwist/next@9.5.12 — src/lib/config/types.ts
export interface SerwistOptions extends Optional<BuildOptions, "globDirectory"> {
  precachePrerendered?: boolean;   // default true
}
```

where `BuildOptions` (`@serwist/cli@9.5.12 dist/chunks/types-DIGJFlHE.d.ts`) is
`InjectManifestOptions & { esbuildOptions?: EsbuildOptions }`, and `InjectManifestOptions`
(`@serwist/build@9.5.12 dist/index.d.mts:174`) is
`BasePartial & GlobPartial & InjectPartial & RequiredSwDestPartial & RequiredGlobDirectoryPartial`.

**The complete set of config-file keys**, from those four interfaces:
`additionalPrecacheEntries`, `disablePrecacheManifest`, `dontCacheBustURLsMatching`,
`manifestTransforms`, `maximumFileSizeToCacheInBytes` (default 2097152), `modifyURLPrefix`,
`globFollow`, `globIgnores`, `globPatterns`, `globStrict`, `templatedURLs`, `injectionPoint`
(default `"self.__SW_MANIFEST"`), `swSrc`, `swDest`, `globDirectory`, `esbuildOptions`,
`precachePrerendered`.

Note what is **absent**: no `register`, no `disable`, no `fallbacks`, no `runtimeCaching`, no
`skipWaiting`, no `importScripts`, no `exclude`, no `cacheOnNavigation`, no `swUrl`. Those belong to
`@serwist/next`'s **webpack** mode (`src/lib/schema.ts` → `injectPartial`) or to the `Serwist`
constructor inside `app/sw.ts`. The docs confirm: "Configurator mode inherits `@serwist/cli`'s
configuration options rather than `@serwist/next`'s"
(<https://serwist.pages.dev/docs/next/config>).

Behaviour `serwist()` adds on top (**VERIFIED**, `src/index.config.ts:47-121`):

- Deletes `swDest` and `swDest.map` before every build: `for (const file of [cliOptions.swDest, `${cliOptions.swDest}.map`]) fs.rmSync(file, { force: true });`. Useful: a stale `public/sw.js` cannot survive a failed build, so `verify-pwa-output.js` cannot pass on a leftover.
- `globPatterns` defaults to `generateGlobPatterns(distDir)` =
  `[".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}", "public/**/*"]`
  plus `".next/server/{app,pages}/**/*.html"` when `precachePrerendered` is true
  (`src/lib/config/utils.ts:13-16`).
- Injects `globIgnores` for `_not-found.html`, `_global-error*`, `pages/404.html`, `pages/500.html`,
  and for `swSrc` / `swDest` / `swDest.map` — then appends yours.
- Injects a `manifestTransforms` entry that rewrites `.next/server/app|pages/x.html` → `/x`,
  `.next/...` → `${assetPrefix}/_next/...`, and **`public/foo` → `${basePath}/foo`**.
- Sets `disablePrecacheManifest: isDev` and `dontCacheBustURLsMatching: /^\.next\/static\//`.
- Sets `esbuildOptions.target` from browserslist (`MODERN_BROWSERSLIST_TARGET` fallback).
- Calls `loadNextConfig()`, which fully evaluates `next.config.js` via `next/dist/server/config.js`.

`serwist()` returns a `Promise<BuildOptions>`; the CLI awaits the default export
(`dist/bin.mjs:15-17,154`: `return (await import(configFile)).default` inside an `async` function, so
the promise is unwrapped). **VERIFIED** by running it: `npx serwist build` printed
`Using configuration from ... .config.js` and wrote the worker.

### The mapping table

| Today (`next.config.js`) | Serwist configurator equivalent | Where it lives | Status |
| --- | --- | --- | --- |
| `dest: 'public'` (→ `public/sw.js`) | `swDest: "public/sw.js"` | `serwist.config.js` | **VERIFIED.** `RequiredSwDestPartial.swDest`, "must end in '.js'". esbuild writes to `path.parse(swDest).dir` with `entryNames: "[name]"`, so the filename is exactly `sw.js`. Confirmed by building: "The service worker file was written to public/sw.js." |
| (implicit) `swSrc` | `swSrc: "app/sw.ts"` | `serwist.config.js` | **VERIFIED.** Required. Bundled by esbuild with `bundle: true`. |
| `register: true` | **No equivalent.** `<SerwistProvider swUrl="/sw.js">` from `@serwist/next/react`, or keep the existing hand-rolled `navigator.serviceWorker.register('/sw.js')` | `app/layout.tsx` or `RootClientLayout.tsx` | **VERIFIED.** See Q3. |
| `disable: process.env.DISABLE_PWA === 'true'` | **No equivalent in the config schema.** Two honest options: (a) guard the build step, e.g. `node -e "process.exit(process.env.DISABLE_PWA==='true'?0:1)" \|\| serwist build`, or a tiny `scripts/build-sw.js` wrapper; (b) `disablePrecacheManifest: process.env.DISABLE_PWA === 'true'`, which still emits a worker, just with no precache manifest — **not** equivalent to today's behaviour. | `package.json` scripts, or `serwist.config.js` | **VERIFIED absent.** `disable` is a webpack-mode-only key (`@serwist/next` `src/lib/schema.ts` `injectPartial.disable`). Option (a) preserves today's semantics (no `public/sw.js` at all), which is what `verify-pwa-output.js:9-12` and `Dockerfile:13,21` assume. |
| `fallbacks: { document: '/offline.html' }` | `fallbacks: { entries: [{ url: "/offline.html", matcher: ({ request }) => request.destination === "document" }] }` | `app/sw.ts`, `Serwist` constructor | **VERIFIED.** Shape from `src/Serwist.ts:45-52` + `PrecacheFallbackPlugin.ts:12-22`. `/offline.html` must be in the precache manifest: `public/**/*` globs `public/offline.html`, and the injected `manifestTransforms` rewrites `public/offline.html` → `/offline.html` (`src/index.config.ts:108-111`). Built and confirmed the entry lands in the manifest. |
| `workboxOptions.skipWaiting: true` | `skipWaiting: true` | `app/sw.ts`, `Serwist` constructor | **VERIFIED.** `src/Serwist.ts:188-196`. Note Serwist's default is `false` (next-pwa's was `true`), and when false it instead installs a `SKIP_WAITING` message listener. Must be set explicitly. |
| `workboxOptions.importScripts: ['/sw-push-handler.js']` | **Do not use `importScripts`.** Use `import "@/lib/pwa/sw-push-handler"` (or `import "../public/sw-push-handler.js"`) at the top of `app/sw.ts` | `app/sw.ts` | **VERIFIED both ways.** A `Serwist({ importScripts })` option does exist (`src/Serwist.ts:178`: `self.importScripts(...importScripts)`), but it throws in a module worker, and `SerwistProvider` registers with `type: "module"` by default (Q3). Bundling works: see Q4. |
| `workboxOptions.exclude: [/app-build-manifest\.json$/, /middleware-manifest\.json$/]` | **Probably nothing to port.** If you want belt-and-braces: `globIgnores: ["**/app-build-manifest.json", "**/middleware-manifest.json"]` (globs, not regexes) | `serwist.config.js` | **Request 280's `globIgnores` suggestion is confirmed as the right mechanism** (`GlobPartial.globIgnores`, passed to node-glob's `ignore`). But the two patterns are likely moot: configurator mode only globs `.next/static/**/*`, `.next/server/{app,pages}/**/*.html` and `public/**/*`, whereas `app-build-manifest.json` lives at `.next/app-build-manifest.json` and `middleware-manifest.json` at `.next/server/middleware-manifest.json`. Neither falls inside those patterns. **Glob patterns VERIFIED from source; the Next.js on-disk locations are INFERRED** — there is no `.next/` in this worktree to check against, so confirm during implementation with `ls .next` and `ls .next/server`. |
| `runtimeCaching[0]`: `urlPattern: /^https:\/\/[^/]*\.supabase\.co\/.*\.(?:png\|jpg\|jpeg\|svg\|gif)(\?.*)?$/`, `handler: 'CacheFirst'`, `cacheName: 'images-cache'`, `expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }` | `{ matcher: /^https:\/\/[^/]*\.supabase\.co\/.*\.(?:png\|jpg\|jpeg\|svg\|gif)(\?.*)?$/, handler: new CacheFirst({ cacheName: "images-cache", plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })] }) }` | `app/sw.ts` | **VERIFIED by building it.** `urlPattern` → `matcher`; handler string → strategy instance; `options.cacheName` → constructor arg; `options.expiration` → `new ExpirationPlugin({...})`. The regex transfers **verbatim** and keeps working cross-origin because it is `^`-anchored (index 0, per `RegExpRoute.ts:55`). |
| `runtimeCaching[1]`: `urlPattern: /^https:\/\/.*\.(?:js\|css)$/`, `handler: 'StaleWhileRevalidate'`, `cacheName: 'static-resources'`, `expiration: { maxEntries: 100, maxAgeSeconds: 604800 }` | `{ matcher: /^https:\/\/.*\.(?:js\|css)$/, handler: new StaleWhileRevalidate({ cacheName: "static-resources", plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })] }) }` | `app/sw.ts` | **VERIFIED by building it.** Also `^`-anchored, so cross-origin matching is preserved. |
| The absence of any Iconify route (`next.config.js:28-47`) | **Keep absent.** Do not import `defaultCache`. Carry the comment block over to `app/sw.ts` verbatim, including both post-mortem references. | `app/sw.ts` | **VERIFIED that absence yields non-interception**, both from source (`Serwist.ts:472-478`, `795-801`) and by executing the built worker (Q5). |
| (new, required) precache manifest wiring | `precacheEntries: self.__SW_MANIFEST` + the `declare global { interface WorkerGlobalScope ... __SW_MANIFEST }` block | `app/sw.ts` | **VERIFIED.** `injectionPoint` default `"self.__SW_MANIFEST"` (`@serwist/build` `InjectPartial`), substituted via esbuild `define`. |
| (new, consider) `esbuildOptions` | `esbuildOptions: { format: "iife" }` if you keep classic `register('/sw.js')`; `define: { "process.env.NODE_ENV": '"production"' }` is **not** required but is cheap insurance | `serwist.config.js` | **VERIFIED.** CLI default is `format: "esm"` (`dist/chunks/errors-DXCDZqq6.js:50`). I built both with and without an explicit `process.env.NODE_ENV` define and the outputs were **byte-identical** (36065 bytes, `cmp` says IDENTICAL), because esbuild auto-defines `process.env.NODE_ENV` from `minify`. That also means a non-minified (dev) build silently flips it to `"development"`. |

### Options with no equivalent, stated as such

- `register: true` → **none**. Q3.
- `disable` → **none** in the config schema. Must be wired by hand in the build script.
- `workboxOptions.exclude` → **no regex-based equivalent**; `globIgnores` is glob-based, and in this
  repo the two patterns appear to be moot anyway.
- next-pwa's `extendDefaultRuntimeCaching` → **none**, and good: `runtimeCaching` in Serwist is
  whatever array you pass, full stop (`src/Serwist.ts:230-247`).
- next-pwa's `cacheOnFrontEndNav` / `reloadOnOnline` / `swUrl` / `scope` → these are
  `SerwistProvider` props in configurator mode, not config-file keys.

### Sizing note, worth a glance during implementation

`globPatterns` defaults include `public/**/*`. This repo's `public/` is **21 MB across 53 files**,
two of which exceed the 2 MB `maximumFileSizeToCacheInBytes` default
(`public/animations/maps.json`, `public/animations/add-button-transition.json`) and will produce
build warnings and be skipped. **VERIFIED** (`du -sh public`, `find public -type f -size +2M`).
`@ducanh2912/next-pwa` also precached `public/` by default, so this is probably parity rather than a
regression, but the warning output will be new and should not be mistaken for a failure.

---

## Q3. Does configurator mode register the service worker?

**VERIFIED. No. Configurator mode injects nothing into the client bundle at all.**

Configurator mode's only job is to produce a `@serwist/cli` config object; `@serwist/next/config`
exports exactly `serwist`, `serwist.withNextConfig`, `generateGlobPatterns` and the `SerwistOptions`
type (`src/index.config.ts`). It never touches webpack, never emits a client chunk, and therefore
cannot do what `@ducanh2912/next-pwa` does today with `register: true`. Removing the plugin removes
the registration. **The app must register the worker itself.**

**There is no `@serwist/next/browser`.** `@serwist/next@9.5.12`'s `exports` map is exactly
`.`, `./config`, `./react`, `./schema`, `./typings`, `./worker`, `./package.json` (VERIFIED,
`package.json`).

The sanctioned path is **`<SerwistProvider swUrl="/sw.js">` from `@serwist/next/react`**
(docs Step 6, <https://serwist.pages.dev/docs/next/config>). Read its implementation before adopting
it, because it does more than register:

```tsx
// @serwist/next@9.5.12 — src/index.react.tsx:28-47
export function SerwistProvider({
  swUrl, disable = false, register = true, cacheOnNavigation = true, reloadOnOnline = true, options, children,
}: SerwistProviderProps): JSX.Element {
  const [serwist] = useState(() => {
    if (typeof window === "undefined") return null;
    if (disable) return null;
    const scope = options?.scope || "/";
    if (!(window.serwist && window.serwist instanceof Serwist) && "serviceWorker" in navigator) {
      window.serwist = new Serwist(swUrl, { ...options, scope, type: options?.type || "module" });
      if (register && !isCurrentPageOutOfScope(scope)) {
        void window.serwist.register();
      }
    }
    return window.serwist ?? null;
  });
```

Three things to weigh, all **VERIFIED from that source**:

1. **It registers as a module worker by default** (`type: options?.type || "module"`). That breaks
   `Serwist({ importScripts })` (Q4) and raises a browser-support question. I tested the actual
   built `public/sw.js`: `register("/sw.js", { type: "module" })` and `{ type: "classic" }` **both
   succeed** in Playwright Chromium 153.0.8010.12 and Playwright Firefox 155.0. Pass
   `options={{ type: "classic" }}` if you want to match today's behaviour exactly; it costs nothing.
2. **`cacheOnNavigation` defaults to true**, which monkey-patches `history.pushState` and
   `history.replaceState` to post `CACHE_URLS` messages to the worker (`src/index.react.tsx:55-78`).
   On a Next App Router app that is a per-navigation side effect nothing in this repo has today. Set
   it to `false` unless you specifically want it.
3. **`reloadOnOnline` defaults to true**, which adds `window.addEventListener("online", () =>
   location.reload())` (`src/index.react.tsx:92-99`). This repo already fought an
   unregister-and-reload loop (request 281, `src/lib/pwa/serviceWorkerCleanup.ts`). Set it to
   `false`.

### Recommendation for this repo

**Keep `ServiceWorkerRegistration` (`src/components/layout/RootClientLayout.tsx:237-273`) as the
registration path and do not adopt `SerwistProvider`.** It calls
`navigator.serviceWorker.register('/sw.js')` (line 256), the URL and worker location are unchanged by
configurator mode, and it brings none of the three side effects above. Two defects in it must be
fixed in the same commit, because once it is the *only* registration path they stop being cosmetic:

- **`registrations.length === 0` guard (line 253)**: a client that already has a worker never
  re-registers, so an updated `sw.js` is never picked up through this path. Already flagged by
  research 280. `register()` is idempotent and is the documented way to pick up an update (MDN:
  "Calling `register()` with the same scope and `scriptURL` does not restart the installation
  process, so it is generally safe to call this method unconditionally from a controlled page").
  Drop the guard.
- **The `localhost` / `127.0.0.1` gate (lines 246-247)**: the request flagged this correctly. With
  the plugin gone, this gate means **`npm run start` against a local production build registers no
  worker at all**, so `public/sw.js` can only ever be validated in Docker or on UAT. That is the
  opposite of what this migration needs. Replace the hostname gate with the same signal the rest of
  the pipeline uses: `process.env.NEXT_PUBLIC_DISABLE_PWA !== 'true'` (or simply drop the gate and
  rely on `DISABLE_PWA=true` meaning no `sw.js` is emitted, so `register()` 404s harmlessly).
  Note `DISABLE_PWA` is currently a **server-only** env var (`next.config.js:6`, `Dockerfile:21`);
  reading it in a client component needs a `NEXT_PUBLIC_` twin or an explicit `env` entry.

Also still in scope per the request: `DevServiceWorkerReset` (`RootClientLayout.tsx:218-235`)
unregisters everything and wipes all caches on every mount in development. Harmless in production,
but it guarantees `npm run dev` can never hold a worker, which will make any local verification of
the new worker confusing. Remove it while in this area.

---

## Q4. How does the push handler survive?

**VERIFIED by building it. Import it from `app/sw.ts`; `importScripts` is a trap.**

I copied this repo's real `public/sw-push-handler.js` into the probe project, added
`import "./sw-push-handler.js";` to a `sw.ts`, and ran `serwist build`. All three behavioural markers
survive esbuild bundling and minification into `public/sw-iconify.js`:

```
$ grep -c "UFLOW" public/sw-iconify.js            → 1
$ grep -o "showNotification" public/sw-iconify.js  → showNotification
$ grep -o 'addEventListener("push"' public/sw-iconify.js → addEventListener("push"
```

esbuild normalises the string literal to **double quotes**, so `addEventListener("push"` is the exact
text to match. That is three independently usable assertions for the `verify-pwa-output.js` rewrite.

### Why not `importScripts`

- A `Serwist({ importScripts: [...] })` option exists and does `self.importScripts(...importScripts)`
  (`serwist@9.5.12 src/Serwist.ts:178`). **VERIFIED present.**
- `importScripts()` is unavailable in a module worker, and `SerwistProvider` registers with
  `type: "module"` by default (Q3). This matches the serwist#54 report cited by research 280
  (<https://github.com/serwist/serwist/issues/54#issuecomment-4136791216>: "`Module scripts don't
  support importScripts()`"). **The underlying cause is the module registration type, not Turbopack.**
  Research 280 attributed it to Turbopack mode; the real trigger is `type: "module"`, which
  configurator mode inherits too via `SerwistProvider`. **VERIFIED from the `SerwistProvider`
  source; not reproduced as a thrown error.**
- Keeping `importScripts` would also keep the `/sw-push-handler.js` fetch, which means the nginx
  no-cache rules from release v0.9.9 (retrospective 064) stay load-bearing. Bundling retires that
  whole concern.

### Recommended shape

Move the file into the source tree (e.g. `src/lib/pwa/sw-push-handler.js`) and
`import "@/lib/pwa/sw-push-handler";` as the first line of `app/sw.ts`. Reasons: `public/` is served
verbatim, so leaving it there ships a dead 117-line file to every visitor and keeps it inside the
`public/**/*` precache glob; and importing across the `public/` boundary from `app/` is awkward for
TypeScript path resolution. If you leave it in `public/`, add it to `globIgnores` so it is not
precached alongside the bundled copy.

**One real behaviour change to call out:** today the handler is a separate HTTP resource, so a
push-handler change could in principle ship without a new `sw.js`. After bundling, any change to it
produces a new `sw.js` hash and therefore a worker update. That is better, not worse, but it is a
change.

---

## Q5. Can we assert on the generated worker's registered routes at build time?

**VERIFIED. Yes, and there are two options. The second one is much stronger and I recommend it.**

### Option A (what you asked for): grep-able invariants

esbuild preserves matchers **verbatim** in the minified bundle, including regex literals and arrow
functions. From the real output of `serwist build`:

```
// public/sw-iconify.js (a build WITH an explicit Iconify route)
matcher:/^https:\/\/(api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\//,handler:new q

// public/sw-default.js (a build WITH defaultCache)
{matcher:({sameOrigin:e})=>!e,handler:new p({cacheName:"cross-origin",plugins:[new h({maxEntries:32,maxAgeSeconds:3600})],networkTimeoutSeconds:10})
...
{matcher:/.*/i,method:"GET",handler:new A}
```

Measured presence counts across three real builds:

| grep pattern | `sw.js` (hand-ported, safe) | `sw-default.js` (`defaultCache`) | `sw-iconify.js` (explicit Iconify route) |
| --- | --- | --- | --- |
| `iconify` | 0 | 0 | **1** |
| `unisvg` | 0 | 0 | **1** |
| `simplesvg` | 0 | 0 | **1** |
| `cacheName:"cross-origin"` | 0 | **1** | 0 |
| `matcher:/.*/i` | 0 | **1** | 0 |
| `matcher:\(\{sameOrigin:[A-Za-z_$][\w$]*[,}]` (regex) | 0 | **1** | **1** |

So a four-pattern negative guard on `public/sw.js` catches every variant:

```
iconify | unisvg | simplesvg                       (an explicit CDN route, regex or string matcher)
cacheName:"cross-origin"                           (defaultCache entry 19)
matcher:/.*/i                                      (defaultCache entry 20, and the whole dev branch)
matcher:({sameOrigin:X})=>                         (any hand-written !sameOrigin matcher)
```

**Important false-positive warning:** do **not** grep for bare `cross-origin`. The safe build contains
it once, as the internal error code string `"cross-origin-copy-response"` (from
`serwist/src/copyResponse.ts`). Match `cacheName:"cross-origin"` or
`/cacheName\s*:\s*["']cross-origin["']/`.

**Honest limitation:** every one of those patterns depends on esbuild's current minifier output
shape (double-quoted strings, `matcher:` property name surviving unmangled, arrow syntax preserved).
`mangleProps` is a supported `esbuildOptions` key, so a future config change could rename `matcher`
and silently void the guard. A guard that can silently stop guarding is exactly the learning-278
failure mode this repo keeps hitting.

### Option B (recommended): execute the shipped worker and spy on `respondWith`

The property we actually care about is "the worker does not call `event.respondWith()` for an
Iconify request". That is directly testable on the shipped artifact with `node:vm` and stubbed
service-worker globals — no bundler-shape assumptions, no browser.

**VERIFIED working.** I wrote `/tmp/sw-probe/sandbox-probe.mjs` (~90 lines, zero dependencies beyond
`node:vm` and `node:fs`): it stubs `self` (`addEventListener`, `skipWaiting`, `registration`,
`clients`, `caches`, `importScripts`, `location`), evaluates `public/sw.js`, captures the `fetch`
listener Serwist registers via `addEventListeners()`, then dispatches a fake `FetchEvent` whose
`respondWith` is a spy. Results against the three real builds:

```
===== public/sw.js (hand-ported, safe) =====
  api.iconify.design     intercepted=false
  api.unisvg.com         intercepted=false
  api.simplesvg.com      intercepted=false

===== public/sw-default.js (defaultCache) =====
  api.iconify.design     intercepted=true
  api.unisvg.com         intercepted=true
  api.simplesvg.com      intercepted=true

===== public/sw-iconify.js (explicit NetworkOnly route) =====
  api.iconify.design     intercepted=true
  api.unisvg.com         intercepted=true
  api.simplesvg.com      intercepted=true
```

Clean separation, deterministic, runs in well under a second, and it asserts the exact invariant from
`next.config.js:42-44`. It also **cannot pass vacuously** the way the grep can: if the stub is
insufficient for a future Serwist version the script throws, which fails loud.

Two caveats, stated plainly:
- It proves "no route is registered", not "Iconify works in Firefox". Those are different claims; Q6
  explains why the second one is not testable here.
- A positive control is needed so the guard cannot pass because nothing was loaded. In my probe the
  obvious control (a same-origin precached document) returned `false` for the safe build, because the
  probe stubbed `__SW_MANIFEST` keys as `public/offline.html` rather than the transformed
  `/offline.html`. In the real repo the injected `manifestTransforms` rewrites that, so assert
  `intercepted === true` for a URL that is genuinely in the built manifest (read it out of `sw.js`).

### Third layer: assert the source, not just the output

Factor the two runtime caching rules into a module (e.g. `src/lib/pwa/runtimeCaching.ts`) that
`app/sw.ts` imports, then unit-test it in Vitest: iterate every entry and evaluate its `matcher`
against the three Iconify URLs with `{ url, sameOrigin: false, request }`, asserting none match.
This is the replacement for the now-obsolete `src/__tests__/config/pwa-config.test.ts:39` assertion
(`expect(configSource).toContain('workboxOptions:')`), and it preserves that file's original intent
(no cross-origin catch-all, no Iconify route) instead of deleting it. Keep the two CSP assertions in
that file and de-duplicate the two identical `describe` blocks (lines 80-103 and 105-128).

### For the `verify-pwa-output.js` rewrite

Assertion 1 (`public/sw.js` exists) is unchanged and still meaningful: `serwist()` `fs.rmSync`s the
destination before every build, so the file cannot be stale.

Assertion 2 should become three string checks on the push-handler **behaviour**, all VERIFIED present
in a real bundled build: `addEventListener("push"`, `showNotification`, `UFLOW`. Keep the failure
message pointing at the push handler import in `app/sw.ts`.

---

## Q6. Firefox ETP in Playwright

**VERIFIED: the proposed spec is theatre. It would pass whether or not the service worker intercepts
Iconify. Q5 Option B is the real protection.**

Three independent findings.

### 1. Playwright does support `firefoxUserPrefs`, and ETP can be switched on

`launchOptions.firefoxUserPrefs` accepts arbitrary `about:config` prefs. A Playwright project would
look like:

```ts
{
  name: 'firefox-etp',
  use: {
    ...devices['Desktop Firefox'],
    launchOptions: {
      firefoxUserPrefs: {
        'privacy.trackingprotection.enabled': true,
        'privacy.trackingprotection.socialtracking.enabled': true,
        'privacy.trackingprotection.cryptomining.enabled': true,
        'privacy.trackingprotection.fingerprinting.enabled': true,
        'privacy.annotate_channels.strict_list.enabled': true,  // ETP "Strict"
        'network.cookie.cookieBehavior': 5,                     // Total Cookie Protection
      },
    },
  },
}
```

Mechanically fine. `playwright.config.ts:20` is currently `projects: [{ name: 'chromium', ... }]`, so
adding a project is a one-line change plus `npx playwright install firefox` in CI. The repo pins
`@playwright/test: ^1.63.0` and `playwright: ^1.60.0` (`package.json:110,142`).

### 2. The Iconify domains are not on any tracking-protection blocklist

**VERIFIED.** Firefox ETP classifies by the Disconnect list. I downloaded the upstream list and
grepped it:

```
$ curl -s https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json
  → 378249 bytes
$ grep -c iconify   services.json   → 0
$ grep -c unisvg    services.json   → 0
$ grep -c simplesvg services.json   → 0
```

Same result for the two lists a content blocker would use:
`grep -c iconify` on `https://easylist.to/easylist/easyprivacy.txt` → **0**, and on
`https://easylist.to/easylist/easylist.txt` → **0**.

ETP cannot block a domain that is on none of its lists. A spec that enables ETP and asserts the icons
load would pass on day one, with or without the bug, forever.

### 3. I tried to reproduce it anyway, and could not

**VERIFIED by execution.** `/tmp/sw-probe/etp-probe.mjs`: a local `http://127.0.0.1:8899` server
(secure context, so service workers register) serving a page plus a classic service worker whose
`fetch` listener does `event.respondWith(fetch(event.request))` for `api.iconify.design` — i.e. the
exact NetworkOnly semantics that were reverted in v0.9.10. The page fetches
`https://api.iconify.design/lucide.json?icons=share-2` once before the worker controls it and once
after, in Playwright Firefox 155.0, with ETP prefs off and on:

```
===== ETP OFF (Playwright default) =====
pageFetch: { ok: true, status: 200, type: "cors" }
controlled: true
swFetch:   { ok: true, status: 200, type: "cors" }

===== ETP ON (strict-ish, 10 prefs incl. annotate_channels.strict_list) =====
pageFetch: { ok: true, status: 200, type: "cors" }
controlled: true
swFetch:   { ok: true, status: 200, type: "cors" }
console: (none)
```

The SW-context re-issued fetch succeeded in both runs. No `status null`, no `no-response :: error:{}`.

**Caveat I will not paper over:** this probe cannot distinguish "the domain is not on the list" from
"a fresh Playwright profile never downloaded a list" (Firefox fetches the url-classifier lists from
shavar at runtime, and Playwright's patched build with a throwaway profile may never do so). Taken
alone the probe is inconclusive. Taken together with finding 2 — the domains are absent from the
upstream Disconnect list entirely — the conclusion holds.

### What this implies about the 064/069 root cause

This is the uncomfortable part. Retrospective 064 and the comment block at `next.config.js:31-44`
both attribute the v0.9.9 regression to "Firefox with Enhanced Tracking Protection". That attribution
appears to rest on user-supplied console evidence (retrospective 069: "The user-provided Firefox
console evidence was incorporated directly into the diagnosis") and was never checked against a
blocklist. The repo's own comment hedges — "or any browser extension that classifies CDN domains as
trackers" — and that hedge is doing all the work: it was most likely a content blocker with a custom
or non-standard list, or something else entirely.

**This does not weaken the fix.** Removing the route was correct, and the no-interception property is
worth defending. But it does mean:
- Do **not** write the ETP Playwright spec. It would be a green check that proves nothing, i.e. the
  "guard shipped on a build path nothing executes" pattern the request warns about.
- The honest acceptance criterion is **Q5 Option B** ("the shipped `public/sw.js` registers no route
  matching the three Iconify origins"), plus the existing manual UAT check that icons render on
  `/p/[id]`.
- If you want *a* Firefox e2e project, add one that just asserts the icons render on `/p/[id]`
  without ETP prefs. That has real value (it is cross-browser coverage this repo has none of today)
  but it is not the Iconify guard, and it should not be labelled as one.

A note on a tempting alternative I tested and rejected: `PerformanceResourceTiming.workerStart` does
**not** discriminate interception. In Playwright Chromium it was non-zero (59.9 ms and 17.2 ms) in
*both* the intercepting and non-intercepting cases, because it marks fetch-event dispatch for any
controlled page regardless of `respondWith`; in Playwright Firefox it was `0` in both. **VERIFIED** via
`/tmp/sw-probe/workerstart-probe.mjs`. Do not build a guard on it.

Finally: the Iconify CDN is a **live third-party dependency**. Any e2e spec asserting those icons
render will flake when `api.iconify.design` is slow or down. `e2e/sw-session-boundary.spec.ts` and
the existing 6-spec suite have no such dependency today. Weigh that before adding one.

---

## Could not determine

1. **Whether `.next/app-build-manifest.json` and `.next/server/middleware-manifest.json` fall
   outside configurator mode's glob patterns in this repo.** The glob patterns are VERIFIED from
   `@serwist/next/src/lib/config/utils.ts`; the on-disk locations are INFERRED from the standard Next
   layout. There is no `.next/` in this worktree (`ls -d .next` → absent) and running a build was out
   of scope. Confirm with `ls .next .next/server` during implementation before dropping the
   `exclude` patterns.
2. **Whether a real build of THIS repo emits a working worker in configurator mode.** Still unproven,
   as it was after request 280. Everything above was validated against a synthetic 2-route worker in
   `/tmp/sw-probe`, not against this app's real precache manifest, real `next.config.js` evaluation
   (`loadNextConfig` runs the whole file, including `buildCsp()` and the `ANALYZE` branch), or
   `output: 'standalone'`. The Docker build gate in the request's Phase 4 remains the only way to
   close this.
3. **Whether `serwist build` works when `next.config.js` is still wrapped by
   `@next/bundle-analyzer`.** `loadNextConfig` fully evaluates the config via
   `next/dist/server/config.js`, and the `ANALYZE=true` branch (`next.config.js:422-425`) returns a
   webpack-plugin-wrapped object. Not tested. Relevant only to the `analyze` script.
4. **The exact Firefox version that first supported module service workers.** MDN's compat table was
   truncated in the fetch. I VERIFIED empirically that Playwright Firefox **155.0** registers the
   built `sw.js` as `type: "module"` successfully, and Playwright Chromium **153.0.8010.12** likewise.
   What the oldest supported Firefox in this app's real user base does is unknown. This is why the Q3
   recommendation keeps classic registration.
5. **What actually caused the v0.9.9 Iconify regression**, given that neither Disconnect, EasyPrivacy,
   nor EasyList lists the three domains. The "Firefox ETP" attribution in retrospective 064,
   retrospective 069, `next.config.js:31-44` and `src/__tests__/config/pwa-config.test.ts:16-24` is
   **unverified**. Candidates not investigated: a specific content blocker with a custom list;
   Firefox's Total Cookie Protection / state partitioning interacting with the SW's
   `CacheStorage`; the `no-cors` / `cors` mode of the re-issued `Request` clone; an Iconify-side rate
   limit; the request's `Origin` header differing from a SW-context fetch. Anyone relying on the
   stated mechanism should treat it as folklore until re-derived.
6. **Whether `@serwist/next@9.5.12`'s `react` peer (`>=18.0.0`, upstream devDep `react@19.2.5`) has
   any practical issue with this repo's `react@^18.3.1`.** `SerwistProvider` uses only `useState` /
   `useEffect` / `createContext`, so it should be fine, but I did not typecheck it against React 18
   types. Moot if you follow the Q3 recommendation and never import it.
7. **Whether `esbuildOptions.format: "iife"` interacts badly with anything.** The default `"esm"`
   output happened to contain no top-level `import`/`export` statements for my test workers (head is
   `var N=[{url:...}]`, tail is `.addEventListeners();`), so it registered fine as both classic and
   module. A worker whose source re-exports something would differ. Not tested.

---

## Changes made in this worktree

**One file added: this document.** Nothing else.

- `next.config.js`, `package.json`, `package-lock.json`, build scripts and all source files are
  untouched. No `node_modules` was created in the worktree.
- Inspection and execution happened in `/tmp/serwist-inspect` (extracted `npm pack` tarballs) and
  `/tmp/sw-probe` (throwaway project: four real `serwist build` runs, three Playwright probes).
- `npx playwright install firefox` / `chromium` downloaded into the shared machine-level cache at
  `~/Library/Caches/ms-playwright` (firefox-1543, chromium-1193). Not a project dependency.

## Probe scripts, for reproduction

| Script | What it proves |
| --- | --- |
| `/tmp/sw-probe/sandbox-probe.mjs` | Q5 Option B. Executes a built `public/sw.js` under `node:vm` and reports whether `respondWith` fires for each Iconify origin. **This is the one worth porting into the repo as a guard.** |
| `/tmp/sw-probe/etp-probe.mjs` | Q6. Playwright Firefox, ETP off vs on, page fetch vs SW-intercepted fetch to `api.iconify.design`. |
| `/tmp/sw-probe/workerstart-probe.mjs` | Q6 negative result. `PerformanceResourceTiming.workerStart` does not discriminate interception, in either Chromium or Firefox. |
| `/tmp/sw-probe/modulesw-probe.mjs` | Q3/Q4. `register('/sw.js', { type })` for `"module"` and `"classic"` in Chromium 153 and Firefox 155. |
| `/tmp/sw-probe/sw-{safe,default,iconify}.ts` + `serwist.*.config.js` | Q2/Q5. The three real `serwist build` outputs the invariant table was measured against. |

These live in `/tmp` and will not survive a reboot. Port `sandbox-probe.mjs` into the repo during
implementation rather than re-deriving it.
