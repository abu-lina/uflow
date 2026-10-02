---
ID: 282
Origin: 282
UUID: 0591A044-6CDC-487B-9112-F1192568CA95
Status: Active
Type: refactor
Branch: refactor/282-serwist-migration
Worktree: ../uflow-wt/282-serwist-migration
Created: 2026-10-02T08:15:17Z
---

# Request 282: replace @ducanh2912/next-pwa with Serwist (configurator mode)

## Original request

> Replace @ducanh2912/next-pwa (abandoned, last published 2024-09-18) with
> Serwist. It's what pins the repo to `--webpack`.

Gated behind request 280 (readiness check), which returned GO-WITH-CAVEATS. See
`agent-output/research/280-serwist-readiness.md` for the verified version and
Next 16 support evidence; do not re-derive it.

## Classification

- **Type:** refactor
- **Route:** Refactor flow (Grill -> Implement -> Code Review -> Done)
- **Confidence:** medium. The dependency and version questions are settled. The
  runtime caching semantics are NOT, see the blocking risk below.

## Settled inputs from request 280

- Target: `@serwist/next` **configurator mode** (`@serwist/next/config` +
  `@serwist/cli`), NOT `@serwist/turbopack`. Configurator mode keeps the worker at
  `public/sw.js`, which is what `Dockerfile:76` copies, what
  `scripts/verify-pwa-output.js` asserts, what `scripts/check-uat-pwa-config.sh`
  checks, and what `RootClientLayout.tsx:256` registers.
- Stable versions: `serwist`, `@serwist/next`, `@serwist/cli` all at 9.5.12
  (2026-07-22). Peer range `next >=14.0.0`; upstream devDeps pin `next 16.2.10`.
  Pin exact versions, no caret (org guardrail, and the current
  `@ducanh2912/next-pwa: ^10.2.9` caret is itself a follow-up).
- `--webpack` comes off 6 of 7 entry points. `analyze` must keep it because
  `next.config.js:422-425` wraps `@next/bundle-analyzer`, a webpack plugin.
- Pre-existing couplings to resolve or leave deliberately: `experimental.webpackBuildWorker`
  (`next.config.js:183`) is webpack-only, and `turbopack.rules` (`next.config.js:187-194`)
  points at `@svgr/webpack`, which is NOT installed and is inert only because every
  build currently runs webpack.

## BLOCKING RISK: the runtimeCaching config is load-bearing, not boilerplate

Found while scoping, and NOT covered by the 280 research. This is the single
biggest hazard in the migration and it must be settled before implementation.

`next.config.js:21-48` carries two hard-won constraints, both with written
post-mortems (`agent-output/analysis/closed/046-iconify-pwa-analysis.md` and
`agent-output/retrospectives/closed/064-iconify-sw-cors-fix-retrospective.md`):

1. **`workboxOptions` must stay nested.** In `@ducanh2912/next-pwa@10.x`,
   workbox options placed at the top level are silently ignored, which activates
   the library's built-in default cache. That default cache includes a
   `!sameOrigin` NetworkFirst catch-all which intercepted Iconify CDN requests;
   combined with `fallbacks.document`'s `handlerDidError`, it returned
   `Response.error()` for generic fetches and produced "CORS request did not
   succeed (status null)" on `/providers/[id]`.
2. **There is deliberately NO route registered for the Iconify CDN domains**
   (`api.iconify.design`, `api.unisvg.com`, `api.simplesvg.com`). A `NetworkOnly`
   route was tried as a safety net and made things worse: Workbox intercepts the
   request and re-issues `fetch()` from the service-worker context, which Firefox
   with Enhanced Tracking Protection blocks at the network layer (status null).
   The only correct configuration is for Workbox not to intercept these requests
   at all, so the browser handles them natively.

   > **Correction (2026-10-02, after implementation).** The "Firefox with Enhanced
   > Tracking Protection blocks it at the network layer" half of point 2 is
   > **unverified folklore** and has been retracted. The three domains are on none
   > of the lists ETP classifies by (0 matches in Disconnect's `services.json`,
   > EasyPrivacy and EasyList), and a Playwright Firefox 155 reproduction of the
   > exact reverted semantics returned HTTP 200 with ETP both on and off. The
   > _rule_ is unchanged and still enforced: register no route, so the worker never
   > calls `respondWith` and the request is never re-issued from the SW context.
   > Only the stated mechanism was wrong. Dated corrections are appended to
   > retrospectives 064 and 069; `src/__tests__/config/pwa-config.test.ts` and
   > `src/lib/pwa/runtimeCaching.ts` carry the corrected wording. See
   > `agent-output/research/282-defaultcache-iconify.md` Q6.

**Why this threatens the migration:** Serwist ships a `defaultCache` export that
most migration examples drop in wholesale. If `defaultCache` contains any
cross-origin catch-all, adopting it reintroduces the exact bug that 046 and 064
were written about. The failure mode is browser-specific (Firefox ETP), on one
route (`/providers/[id]`), with CDN icons, which is precisely the kind of thing
neither the unit suite nor the 6-spec Playwright smoke suite covers.

**Therefore:** the migration must port the runtime caching rules deliberately,
rule by rule, and must NOT adopt Serwist's `defaultCache` without first proving
it registers no cross-origin catch-all. Treat "icons still load on
/providers/[id] in Firefox with ETP on" as an explicit acceptance criterion.

## Guards that will break, and must not be weakened

`scripts/verify-pwa-output.js` asserts two things:

1. `public/sw.js` exists.
2. Its contents include the literal string `sw-push-handler.js`.

Assertion 2 breaks under Serwist. `@ducanh2912/next-pwa` injects
`importScripts: ['/sw-push-handler.js']` (`next.config.js:24`), so the filename
appears literally in the output. Serwist bundles via esbuild, so importing the
handler inlines its code and the filename string disappears.

The honest rewrite preserves the guard's INTENT, which is "the worker was emitted
AND it carries the push-handling logic". Assert on a distinctive string from the
handler's actual behaviour rather than its filename. `public/sw-push-handler.js`
registers a `push` listener and calls `self.registration.showNotification` with a
default title of `UFLOW`. Assert on something in that class, so the guard still
fails if the push logic is dropped. Do NOT just delete assertion 2, and do NOT
relax it to "file is non-empty". Learning 278 is exactly this failure.

Also breaking: `src/__tests__/config/pwa-config.test.ts:39` asserts the literal
string `workboxOptions:` appears in `next.config.js`. Rewrite it against the new
config shape; do not delete the file.

## Carried over from request 281

- Delete `agent-output/debug/281/` per that directory's own README exit condition.
- Decide `ServiceWorkerRegistration` (`RootClientLayout.tsx:237-273`). It was
  deliberately KEPT in 281 because the thing making it redundant is
  `@ducanh2912/next-pwa`'s `register: true` injection (`next.config.js:3`), which
  this request removes. Either Serwist must provide an equivalent registration, or
  this component becomes the only registration path and must lose its localhost
  gate question. Settle it with evidence; do not leave the app with no
  registration path.
- `DevServiceWorkerReset` (`RootClientLayout.tsx:218-235`) is a second blind
  unregister-and-wipe-caches effect, gated on `NODE_ENV === 'development'` and
  localhost. Dead in production, but it means `npm run dev` can never hold a
  service worker. Consider removing it while in this area.

## Verification requirements

- A real `docker build` is mandatory before merge. CI builds via `npm run build`;
  production builds via `build:standalone` from `Dockerfile:56`. Green CI proves
  nothing about the image (learning 278).
- `scripts/verify-pwa-output.js` must be observed RUNNING and passing, not merely
  present.
- The `e2e/sw-session-boundary.spec.ts` guard from 281 must still pass, which also
  proves a worker registers and the precache survives a session boundary.
- Nobody has yet observed a real Turbopack build of this repo emit a working
  service worker. That remains unproven going in.

## Phases

| #   | Phase                                      | Status  | Outcome                                                                                |
| --- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------- |
| 0   | Tracking file created                      | Done    | This file                                                                              |
| 1   | Settle the defaultCache / Iconify question | Done    | STOP on `defaultCache`; see `agent-output/research/282-defaultcache-iconify.md`        |
| 2   | Implement                                  | Done    | Serwist 9.5.12 configurator mode; `--webpack` NOT removed, see "What did not get done" |
| 3   | Code Review                                | Pending |                                                                                        |
| 4   | Docker build gate                          | Done    | `docker build` green; image serves a valid 66,741-byte `/sw.js`                        |
| 5   | Done                                       | Pending |                                                                                        |

## What did not get done, and why

### `--webpack` is still on all 7 entry points. Turbopack cannot build this repo.

This is the request's headline goal and it is **blocked by something unrelated to the
PWA**. Removing `--webpack` was attempted, and `next build` fails:

```
Error: Turbopack build failed with 5 errors:
./node_modules/swagger-client/es/http/serializers/response/index.js:2:1
Error: Export default doesn't exist in target module
> 2 | import jsYaml from 'js-yaml';
The export default was not found in module .../js-yaml/dist/js-yaml.mjs [app-client]
```

Diagnosis, verified:

- `src/app/api-docs/page.tsx` -> `swagger-ui-react@5.33.0` -> `swagger-client@3.38.2`,
  which does `import jsYaml from 'js-yaml'` in five places.
- **js-yaml removed its ESM default export in 4.2.0.** `4.1.0` has `export default
jsYaml`; `4.3.2` and `5.4.2` do not.
- `swagger-client@3.38.2` nonetheless declares `js-yaml: ^4.3.2`, so it is broken against
  its own declared range. This is **not** caused by this repo's `"js-yaml": ">=4.3.0"`
  override, though the override does float it to 5.4.2.
- webpack tolerates the mismatch and silently yields `undefined`, which means **the
  `/api-docs` Swagger UI's YAML handling is already broken at runtime today**. Turbopack
  enforces ESM semantics and fails the build instead.
- There is no clean local escape. Pinning js-yaml back to 4.1.0 reintroduces a **high**
  severity advisory (GHSA-mh29-5h37-fv8m and four others cover 4.0.0-4.3.1), which
  violates the dependency guardrail. `turbopack.resolveAlias` to js-yaml's CJS entry was
  tried and had no effect (the importers are inside `node_modules`, and
  `dist/js-yaml.cjs.js` is not an exported subpath). `swagger-ui-react@5.33.1` is the
  latest and still depends on `swagger-client@3.38.2`.

Status after this request: **the PWA no longer needs webpack at all.** `serwist build`
reads `.next/` and `public/` off disk, so the bundler is irrelevant to whether
`public/sw.js` is emitted. `next.config.js` already carries the `turbopack: {}` key Next 16
demands alongside a `webpack()` function, and the `@svgr/webpack` landmine is gone.
Dropping `--webpack` is a one-token edit per script the moment the swagger/js-yaml problem
is resolved. See the follow-up requests.

### RESOLVED in review follow-up: the offline fallback had been left unreachable

Found while porting, flagged, and then fixed after the reviewer's decision to restore
parity. Recorded in full because the shape of the miss matters more than the fix.

The instruction was "port exactly these two runtime caching rules, and only these", and that
is what was done. But the old worker registered a **third** route that was not in
`workboxOptions.runtimeCaching` and so was not on the port list:

```js
// generated by @ducanh2912/next-pwa's cacheStartUrl default
registerRoute("/", new NetworkFirst({ cacheName: "start-url", plugins: [...] }), "GET")
```

That was the only route that ever handled a document request, and therefore the only place
next-pwa's `self.fallback` / `handlerDidError` could return `/offline.html`. With it gone,
Serwist's `PrecacheFallbackPlugin` was attached to the two remaining strategies (images,
cross-origin js/css), neither of which ever sees `request.destination === 'document'`, so
`fallbacks` was dead config: `/offline.html` stayed precached and still loaded if requested
directly, but an offline navigation got the browser's own error page. `/` also lost its
NetworkFirst cache.

**Restored**, parity only, in `src/lib/pwa/runtimeCaching.ts`:

```ts
{
  matcher: '/',
  handler: new NetworkFirst({ cacheName: 'start-url' }),
},
```

The matcher is the string `'/'`, which is what next-pwa emitted and what Serwist's
`parseRoute` turns into `new URL(capture, location.href)` plus an exact
`url.href === captureUrl.href` comparison. Same-origin, exact, no cross-origin surface.

Deliberately NOT broadened to `request.destination === 'document'`. That would make the
offline page work on `/food` and every other route, but it changes navigation caching
semantics app-wide, which is a behaviour change and not a port. Logged as a follow-up.

What makes this miss interesting: nothing went red. The `fallbacks` entry was present,
`/offline.html` was precached, `verify-pwa-output.js` passed, the Iconify probe passed and
both e2e specs passed. The only signal was reading the generated next-pwa worker and noticing
a route that was never on the port list. The guard now closes it:
`scripts/verify-sw-no-cross-origin-routes.mjs` asserts a document request to `/` IS
intercepted, and was observed failing with the route removed (see the verification record).

## What was found that the plan did not predict

### 1. `@serwist/next`'s manifestTransforms mangles `public/**/*.html` into 404s

The worst finding, and it was caught by the new probe's positive control rather than by any
build output. `@serwist/next@9.5.12 src/index.config.ts:95-104` strips `.html` off **every**
manifest entry, to turn `.next/server/app/foo.html` into the route `/foo`. It runs before
the `public/` prefix strip, so:

- `public/offline.html` -> `/public/offline`
- `public/clear-storage.html` -> `/public/clear-storage`

Both 404. Serwist rejects the `install` event if any precache entry fails to fetch, so the
worker would have **registered and then never installed or activated** — a silent, total
PWA outage that `verify-pwa-output.js` (file exists, push handler present) would have
reported as OK. Fixed in `serwist.config.mjs` by keeping `public/**/*.html` out of
`globPatterns` and re-adding the files through `additionalPrecacheEntries` with their real
URLs and sha256 content revisions.

### 2. The `exclude` globs are genuinely moot, confirmed by `ls` not by inference

`exclude: [/app-build-manifest\.json$/, /middleware-manifest\.json$/]` was dropped, not
ported. Against a real Next 16.3.8 build of this repo:

- `find .next -name app-build-manifest.json` -> **no such file anywhere**. Next 16 does not
  emit it.
- `middleware-manifest.json` is at `.next/server/middleware-manifest.json`.

Configurator mode globs only `.next/static/**/*`,
`.next/server/{app,pages}/**/*.html` and `public/**/*`. Neither path falls in any of them.
Carrying the patterns would have been dead config.

### 3. `@serwist/next@9.5.12` pins a vulnerable `browserslist`

It depends on `browserslist` **4.28.6 exactly**, which carries two high-severity advisories
(GHSA-c83g-rgw3-j3cx unbounded memory growth, GHSA-73wf-gq98-2v4g prototype write; both
`introduced: 0`, `fixed: 4.28.7` per OSV). `npm install` went from 0 to 2 high
vulnerabilities. Resolved with a `browserslist` entry in `overrides`.

That entry was first written `>=4.28.7`, an unbounded range, which the dependency guardrail
forbids. Now pinned to **4.29.1**, published 2026-09-24 (8 days before the pin), with no
advisory in OSV for that version. `npm audit` reports 0 after the pin, which is necessary and
not sufficient: it reads GHSA and lags, so the OSV check is the one that was actually relied
on. Everything in the tree dedupes onto 4.29.1 (`@serwist/cli` via `@serwist/utils`,
`@serwist/next`, `update-browserslist-db`, `@babel/helper-compilation-targets`,
`autoprefixer`).

### 4. Next 16 hard-errors on `webpack()` without `turbopack`

Removing the `turbopack.rules['*.svg']` entry (which pointed at the uninstalled
`@svgr/webpack`) made Turbopack refuse to build: "This build is using Turbopack, with a
`webpack` config and no `turbopack` config." The `webpack()` function is still needed by
`npm run analyze`, so `turbopack: {}` is now present and deliberately empty.

Confirmed before removing the svg rule: no `.svg` is imported as a component anywhere.
Every SVG is a URL through `next/image` or inline JSX (`src/components/ui/Ornament.tsx`).

### 5. `.dockerignore` excluded the new build scripts

`scripts/*` with a single `!scripts/verify-pwa-output.js` exception. `scripts/build-sw.js`
and `scripts/verify-sw-no-cross-origin-routes.mjs` had to be added, or the image build would
have failed at `npm run build:sw`.

### 6. The nginx `/sw-push-handler.js` no-cache blocks are now dead config

`public/sw-push-handler.js` moved to `src/lib/pwa/sw-push-handler.js` and is bundled by
esbuild, so nothing fetches `/sw-push-handler.js` any more (confirmed: it 404s in the built
image). `deploy/nginx/nginx-template.conf` and `nginx-uat-template.conf` still carry
`location = /sw-push-handler.js` no-cache blocks, and `src/__tests__/config/nginx-config.test.ts`
still guards them with 8 passing tests. Nothing is broken, but both now protect a file that
is no longer served. Not removed here (deploy templates are out of this request's scope);
see follow-ups.

## How `DISABLE_PWA` is handled

Configurator mode has no `disable` option: the config schema is `@serwist/cli`'s, which
knows nothing about Next.js plugins. `scripts/build-sw.js` implements both halves by hand:

1. it does not invoke `serwist build`, and
2. it **deletes** any `public/sw.js` and `public/sw.js.map` already on disk.

Step 2 is what keeps `scripts/verify-pwa-output.js:19-22`'s `DISABLE_PWA=true` early exit
honest: without it the script would report success on a build that still shipped a stale
worker. `scripts/verify-sw-no-cross-origin-routes.mjs` honours the same flag the same way.
Verified:

```
$ DISABLE_PWA=true npm run build:sw
DISABLE_PWA=true: removed stale public/sw.js.
DISABLE_PWA=true: skipping service worker build.
DISABLE_PWA=true: skipping service worker verification.
DISABLE_PWA=true: skipping cross-origin interception check.
$ ls public/sw.js
ls: public/sw.js: No such file or directory
```

## CI went red after the first push, on three distinct failures (PR #486)

All three were real, all three were consequences of the migration, and none of them could
have been seen locally through `npm run build`. Runs 37026068710 (CI Pipeline) and
37026068860 (E2E Smoke).

### Failure 1: CI calls `next build` directly, so npm's `postbuild` hook never fires

`FAIL: public/sw.js was not generated.` in Build Verification.

Configurator mode moved worker generation OUT of `next build` and INTO `scripts/build-sw.js`,
reached from `npm run build` through `postbuild`. **npm lifecycle hooks do not run for
`npx next build`**, so every pipeline step that invokes the binary directly produced no
worker, and `scripts/verify-pwa-output.js` correctly failed on the missing file.

Three steps did that, now all calling `npm run build:sw` instead of
`node scripts/verify-pwa-output.js`:

| File                                             | Step                           | Before                                                                   | After                                          |
| ------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------- |
| `.github/workflows/ci.yml:119`                   | Build application              | `... \| tee .next-build-output.txt && node scripts/verify-pwa-output.js` | `... && npm run build:sw`                      |
| `.github/workflows/weekly-quality-gates.yml:39`  | Build application (Lighthouse) | `npx next build --webpack && node scripts/verify-pwa-output.js`          | `npx next build --webpack && npm run build:sw` |
| `.github/workflows/weekly-quality-gates.yml:216` | Build and analyze              | `node scripts/verify-pwa-output.js`                                      | `npm run build:sw`                             |

`set -o pipefail`, the `tee` pipeline and the `&&` chaining in `ci.yml` are unchanged. Side
benefit: `scripts/verify-sw-no-cross-origin-routes.mjs` (the Iconify probe) was never running
in CI before this, because only `build:sw` invokes it.

Every other direct invocation in the repo, checked rather than assumed:

| Site                                                                      | Command                                  | Worker built?          |
| ------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| `Dockerfile:56`                                                           | `npm run build:standalone`               | YES, chains `build:sw` |
| `.github/workflows/e2e.yml:48`                                            | `npm run build` + `verify-pwa-output.js` | YES, via `postbuild`   |
| `.github/workflows/snyk-pr-verification.yml:148`                          | `npm run build`                          | YES, via `postbuild`   |
| `scripts/verify-snyk-pr.sh:129`                                           | `npm run build`                          | YES, via `postbuild`   |
| `scripts/bisect-flicker.sh:115`                                           | `npm run build`                          | YES, via `postbuild`   |
| `deploy/`, `performance-test.yml`, `deploy-uat.yml`, `deploy-hetzner.yml` | no `next build` at all                   | n/a                    |

`e2e.yml:48`'s trailing `node scripts/verify-pwa-output.js` **is now redundant**: `postbuild`
has already run `build:sw`, which runs that script plus the other two guards. Left in place
deliberately rather than changed silently; it is a harmless second run of the same assertion,
and removing it is a one-line follow-up.

### Failure 2: the service worker never finishes installing, because its precache does not fit the rate limiter

```
A bad HTTP response code (429) was received when fetching the script.
TypeError: Failed to register a ServiceWorker ... script ('http://127.0.0.1:3000/sw.js')
Error: the registration must survive the session boundary; Expected: > 0, Received: 0
```

The stated cause (unconditional `register()` amplifying `/sw.js` fetches) was **not** the
cause, and was measured not to be: with the `registrations.length === 0` guard restored, the
spec still failed locally, reproduced on the full `CI=1 npx playwright test` suite. Two
sessions, with and without the guard, both fetch `/sw.js` exactly once; the second fetch is
the browser's own soft update on navigation, not the call site.

The real chain, measured:

1. `@serwist/next` defaults `precachePrerendered` to **true** (`dist/index.config.mjs:29,36`),
   appending `.next/server/{app,pages}/**/*.html` to the glob. `@ducanh2912/next-pwa` never
   did this. Compared against the live next-pwa worker on `https://ummahflow.com/sw.js`:
   **54 -> 112** precache entries that `src/middleware.ts` counts, +61 document routes
   (`/about`, `/login`, 16 x `/create/*`, 20 x `/city/*`, ...).
2. The non-API bucket is **100 requests/min per client IP** (`src/middleware.ts:11-12`,
   matcher at `:137` excludes only `/api`, `/_next/static`, `/_next/image`, `favicon.ico`).
   The page view that triggers the install has already spent ~50 of it.
3. The tail of the precache gets 429s. Serwist rejects the `install` event on any non-OK
   precache response, so the worker stays stuck `installing` forever: never activates, no
   offline page, no push, and nothing in the build output says so.
4. The registration therefore does not survive the session, and session 2 re-registers into
   a bucket that is still spent, which is the 429 on `/sw.js` in the CI log.

Measured with a throwaway Playwright probe against `npm run start`, one synthetic client IP:

| Build                                | 429s                                       | Worker state after 8s | Precached  |
| ------------------------------------ | ------------------------------------------ | --------------------- | ---------- |
| `precachePrerendered` default (true) | 10 (`/images/seals/*`, `/images/Home.png`) | `installing`, forever | 86 of 112  |
| `precachePrerendered: false`         | **0**                                      | **`activated`**       | 290 of 290 |

Fix: `precachePrerendered: false` in `serwist.config.mjs`. That is parity with next-pwa, not
a workaround; middleware-matched entries go 112 -> 51 (the 3 missing vs next-pwa's 54 are
`/sw-push-handler.js` and `/fallback-*.js`, which no longer exist, and the two Lottie JSONs,
now over `maximumFileSizeToCacheInBytes`). Guarded by a new assertion in
`src/__tests__/config/pwa-config.test.ts`.

**The rate limiter was not touched**, and must not be: in production nginx proxies image and
document requests to Next with the real client IP
(`deploy/nginx/nginx-uat-template.conf:161-170`), so a 112-request precache would blow a real
visitor's own budget on their first page view too. The limiter was reporting a true fact.

The `registrations.length === 0` guard is restored anyway, on its own merits (reversing
decision 7): `register()` runs an update check that refetches `/sw.js`, this effect runs on
every mount of the root layout, and request 281's four-arm fixture already proved the guard
costs nothing in update coverage because the browser soft-updates an in-scope worker on
navigation. One fetch per page view against each real user's own rate-limit budget is a
production cost with no benefit, so dropping it was a (smaller) regression in its own right.

The `x-forwarded-for is not allowed by Access-Control-Allow-Headers` CORS noise for the
Iconify domains in that log is the known, documented side effect of the spec's
`extraHTTPHeaders` applying to cross-origin fetches. No assertion depends on it.

#### Failure 2, part two: a service worker's script fetch ignores `extraHTTPHeaders`

The precache fix was necessary and not sufficient. CI run 37031029612 came back with
`e2e/pwa.spec.ts` green (so `/sw.js` was being served) and the session-boundary spec red at
the **first** session: `first session registered no service worker`, 429 on `/sw.js` again.

The downloaded Playwright trace settled it from one side: that session's own page load made
**17** rate-limited requests, so its per-IP bucket could not possibly be full. Then from the
other side, locally:

1. Three back-to-back page loads on three different synthetic IPs, each installing the full
   290-entry worker: 0 x 429, all three `activated`. So the worker's **precache** fetches do
   carry the page context's `extraHTTPHeaders`.
2. 105 header-less requests to `/offline.html` to exhaust the shared `'unknown'` bucket, then
   the same path twice: header-less **429**, with `x-forwarded-for` **200**.
3. With that bucket still spent, a fresh-IP page load (`10.242.0.1`): `registrations=0`,
   `/sw.js` statuses `[429]`, console
   `A bad HTTP response code (429) was received when fetching the script`.

So the service worker's **script** fetch does not carry the context's `extraHTTPHeaders`,
which means `e2e/fixtures.ts`'s per-test synthetic IP never applied to it and it always fell
into `getTrustedClientIp`'s shared `'unknown'` bucket (`src/lib/security/clientIp.ts:40`).
Six specs' worth of worker traffic spent that bucket before the PWA spec ran.

Two test-layer fixes, neither touching the limiter:

- `playwright.config.ts`: `use.serviceWorkers: 'block'`. The suite runs against a production
  build, so every page load in six specs that assert nothing about the PWA was registering a
  worker and precaching 290 URLs. `e2e/sw-session-boundary.spec.ts` launches its own
  persistent context with `serviceWorkers: 'allow'` and `e2e/pwa.spec.ts` only uses `request`,
  so the two specs that do test the worker are unaffected.
- `e2e/fixtures.ts`: the `request` fixture now gets its own synthetic IP (`10.230.*`), the
  same treatment `page` has always had. Playwright's built-in `APIRequestContext` sends no
  proxy header, so every `request.get()` in the suite was also sharing `'unknown'`, and both
  PWA specs open with `request.get('/sw.js')` as a precondition. That was the whole of CI run
  37030165919: both specs red in under 150ms on a 429 that says nothing about the worker.

### Failure 3: a regression test still pointed at the old config location

`src/__tests__/regression/plan211-map-tiles-iphone.test.ts` read `next.config.js` and asserted
the Supabase image-cache regex was present as **text**. The rule moved to
`src/lib/pwa/runtimeCaching.ts`. Repointed at the imported `runtimeCaching` array: it now
asserts a Supabase Storage image matches and that `tile.openstreetmap.de`,
`basemaps.cartocdn.com`, `api.iconify.design` and `example.com` do not. Stronger than before,
because the old version could only catch one literal spelling of a broadened regex. Shown
failing on a deliberately broadened matcher:
`https://tile.openstreetmap.de/12/2048/1361.png must not hit the image cache: expected true to be false`.

## Verification record

| Check                                                                    | Result                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run build:raw` (next build + build:sw)                              | PASS                                                                                                                                                                           |
| `scripts/verify-pwa-output.js` observed running                          | PASS — `OK: public/sw.js generated and the push handler is bundled into it`, markers `addEventListener("push"`, `showNotification`, `UFLOW`                                    |
| `scripts/verify-sw-no-cross-origin-routes.mjs` observed running          | PASS — controls `/offline.html` INTERCEPTED and `/` INTERCEPTED for a document request; all three Iconify origins not intercepted                                              |
| Probe deliberately failed, build 1: `runtimeCaching = defaultCache`      | **FAILS as designed** — all three origins INTERCEPTED, exit 1                                                                                                                  |
| Probe deliberately failed, build 2: explicit Iconify `NetworkOnly` route | **FAILS as designed** — all three origins INTERCEPTED, exit 1                                                                                                                  |
| `pwa-config.test.ts` deliberately failed against `defaultCache`          | 5 of 10 tests fail                                                                                                                                                             |
| `e2e/sw-session-boundary.spec.ts` (request 281 guard)                    | PASS — registrations > 0 and cacheKeys > 0 on both sessions, so registration and precache install both work under the new path                                                 |
| `e2e/pwa.spec.ts`                                                        | PASS                                                                                                                                                                           |
| `npx tsc --noEmit`                                                       | PASS                                                                                                                                                                           |
| `npm run lint`                                                           | PASS — 0 errors, 132 warnings (unchanged from baseline)                                                                                                                        |
| `npm audit`                                                              | 0 vulnerabilities                                                                                                                                                              |
| `docker build`                                                           | PASS — all three guards ran and passed inside the image build                                                                                                                  |
| Image contents                                                           | `/app/public/sw.js` present, 66,741 bytes, push markers present, 0 occurrences of `iconify`/`unisvg`/`simplesvg`/`cacheName:"cross-origin"`, 0 bogus `/public/*` precache URLs |
| Container serves it                                                      | `/sw.js` 200, `/offline.html` 200, `/clear-storage.html` 200, `/sw-push-handler.js` 404 (expected: now bundled)                                                                |

### Re-verified after the review follow-ups (start-url route, probe control, browserslist pin)

| Check                                                              | Result                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build` with all three guards observed                     | PASS — build green, `build:sw` ran `build-sw.js`, `verify-pwa-output.js`, `verify-sw-no-cross-origin-routes.mjs`; 351 URLs / 18.6 MB precached                                                                                                 |
| New start-url control, route **removed**                           | **RED as designed** — `FAIL: public/sw.js did not intercept a document request to https://ummahflow.com/.`, exit 1, with the restore snippet printed. `/offline.html` control still green, which is the point: only the new control catches it |
| New start-url control, route **restored**                          | GREEN — `(control) https://ummahflow.com/ INTERCEPTED for a document request, as it must be`, exit 0                                                                                                                                           |
| `npm run analyze` (the one entry point still carrying `--webpack`) | **PASS** — exit 0, three reports written to `.next/analyze/{nodejs,edge,client}.html`, then `build:sw` and all three guards green. Previously untested; it works                                                                               |
| `src/__tests__/config/pwa-config.test.ts`                          | PASS — 11 tests (was 10; one added for the start-url route)                                                                                                                                                                                    |
| `e2e/sw-session-boundary.spec.ts` + `e2e/pwa.spec.ts`              | PASS — 2 passed, run with `CI=1` so the webServer is `npm run start` on a production build and the `/sw.js` 200 assertion applies instead of the local skip                                                                                    |
| `npx tsc --noEmit`                                                 | PASS                                                                                                                                                                                                                                           |
| `npm run lint`                                                     | PASS — 0 errors, 132 warnings (unchanged from baseline)                                                                                                                                                                                        |
| `npm audit` after the browserslist pin                             | 0 vulnerabilities. Treated as necessary, not sufficient; the OSV query for `browserslist@4.29.1` returning no vulns is the evidence relied on                                                                                                  |
| `docker build` re-run (worker source changed)                      | PASS — all three guards ran and passed **inside** the image build, including the new start-url control: `(control) https://ummahflow.com/ INTERCEPTED for a document request, as it must be`                                                   |
| Image contents after re-run                                        | `/app/public/sw.js` present, 66,794 bytes (+53 for the start-url route), 1 `start-url` occurrence, push markers present, 0 occurrences of `iconify`/`unisvg`/`simplesvg`, 0 bogus `/public/*` precache URLs, `/offline.html` in the manifest   |

Build warnings that are new and expected, not failures:

```
public/animations/maps.json is 2.22 MB, and won't be precached.
public/animations/add-button-transition.json is 9.82 MB, and won't be precached.
```

`maximumFileSizeToCacheInBytes` was deliberately **not** raised. Both files are already
loaded lazily and precaching 12 MB of Lottie JSON on install would be worse than the
warning. Precache totals: 351 URLs / 18.6 MB locally, 331 URLs / 17.5 MB in Docker (the
`.dockerignore` `*.md` rule drops a handful of README files from `public/`).

Precache totals changed again with `precachePrerendered: false`: **290 URLs / 15.6 MB**
locally, of which 51 are paths `src/middleware.ts` rate-limits.

### Re-verified after the CI fixes (hook, precache scope, repointed test)

| Check                                                                               | Result                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx next build --webpack && npm run build:sw`, the exact command `ci.yml` now runs | PASS. The step never exercised locally before this: `public/sw.js` written, 331 URLs precached, then all three guards green. Previously this exact command produced no worker at all                                                           |
| `npm run build` (the `postbuild` path)                                              | PASS, 290 URLs / 15.6 MB, all three guards green                                                                                                                                                                                               |
| `CI=1 npx playwright test` (full suite, twice)                                      | PASS both times, 7 passed. This is what reproduces the CI failure: the 2-spec run passed even with the bug, because the failure needs the other specs' concurrent load                                                                         |
| `CI=1 npx playwright test e2e/sw-session-boundary.spec.ts e2e/pwa.spec.ts`          | PASS, registrations > 0 on both sessions, no 429 for `/sw.js`                                                                                                                                                                                  |
| Install-time 429 probe, `precachePrerendered` default                               | **RED** — 10 x 429, worker `installing` after 8s, 86 of 112 entries cached. This is the CI failure, reproduced locally                                                                                                                         |
| Install-time 429 probe, `precachePrerendered: false`                                | GREEN — 0 x 429 across 357 responses, worker `activated`, 290 of 290 entries cached                                                                                                                                                            |
| `plan211-map-tiles-iphone.test.ts` repointed                                        | PASS (3 tests), and shown RED against a deliberately broadened matcher                                                                                                                                                                         |
| `pwa-config.test.ts`                                                                | PASS, 12 tests (was 11; one added for `precachePrerendered: false`)                                                                                                                                                                            |
| `npx tsc --noEmit`                                                                  | PASS                                                                                                                                                                                                                                           |
| `npm run lint`                                                                      | PASS, 0 errors, 132 warnings (unchanged baseline)                                                                                                                                                                                              |
| `docker build`                                                                      | NOT re-run. Nothing here touches the Dockerfile or `.dockerignore`, and the image path builds through `build:standalone`, which already chained `build:sw`. `precachePrerendered: false` changes the manifest contents, not how it is produced |

### Pre-merge additions: static-asset exemption + runtime document caching

Two changes decided by the reviewer after PR #486 went green. Both address the same
measurement: with `precachePrerendered: false` the install fitted inside the 100 req/min
bucket, but only barely, and the offline page still covered `/` alone.

#### 1. Static assets are exempt from the page rate limit (`src/middleware.ts`)

`_next/static` and `_next/image` were ALREADY fully exempt, because the matcher at
`src/middleware.ts:135-140` excludes them. Files served out of `public/` (`/images/**`,
`/icons/**`, `/sw.js`, `/offline.html`) are the same class: immutable files, no auth, no
database access, no side effects, and fronted by Cloudflare with
`public, max-age=31536000, immutable`. Counting one class and not the other was the
inconsistency; a service-worker precache is one logical action, and 290 requests from one
client in one second is not abuse.

Implemented as an in-handler predicate, not a matcher regex: a matcher with a nested
lookahead plus `(?:...)` and `$` is fragile under path-to-regexp, and
`isStaticAssetRequest()` is directly unit-testable.

```ts
const STATIC_ASSET_PATHNAME =
  /\.(?:css|js|mjs|map|json|webmanifest|html|txt|xml|png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp4|webm|wasm)$/i;
// ...
} else if (!isStaticAssetRequest(pathname)) {
```

Matched by file EXTENSION, deliberately, and not by directory prefix: `/images` as a prefix
would also exempt a future `/images` page. Verified that nothing in `src/app/` can collide:
no route segment contains a dot, and there is no `sitemap.xml`/`robots.txt` route (checked
with `find src/app -type d -name "*.*"` and `find src/app -name "sitemap*" -o -name
"robots*"`, both empty).

**Nothing else moved.** No limit was raised. `getRateLimitKey`, `checkRateLimit`,
`RATE_LIMIT_MAX_REQUESTS`, `API_RATE_LIMIT_MAX_REQUESTS`, `src/lib/security/clientIp.ts` and
`shouldRedirectToWaitlist` are untouched, and exempt paths still fall through to
`NextResponse.next()`.

#### 2. Runtime document caching (`src/lib/pwa/runtimeCaching.ts`)

The `{ matcher: '/', handler: new NetworkFirst({ cacheName: 'start-url' }) }` route is
replaced by:

```ts
{
  matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
  handler: new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
}
```

It subsumes the start-url route, since `/` is a document request. Offline now works on any
page the user has actually visited, and the offline fallback is reachable from every
same-origin navigation instead of only `/`.

**Why not `precachePrerendered: true`, which also widens offline coverage:** it buys that
coverage by downloading all **61 prerendered HTML documents** into every first-time
visitor's cache during install. That is the thing that took middleware-counted install
requests from 54 to 112 and left the worker stuck `installing`. It stays `false`. Runtime
caching gets the same user-visible benefit for the pages that matter (the ones actually
visited) at zero install cost. `networkTimeoutSeconds: 10` so a dead-slow network falls
back to cache rather than hanging.

#### The function-matcher ban had to change, and was replaced by something stronger

`src/__tests__/config/pwa-config.test.ts` banned function matchers outright, which is how it
structurally excluded `defaultCache`'s `({ sameOrigin }) => !sameOrigin`. A function matcher
is now required, so the syntactic ban is replaced by the property it stood in for: **every
matcher, whatever its shape, must evaluate to `false` for a cross-origin request to
`api.iconify.design`, `api.unisvg.com` and `api.simplesvg.com`**, evaluated at three
`request.destination` values (`document`, `image`, unset). Function matchers are called with
a realistic Serwist matcher argument (`{ url, request, sameOrigin, event }`); the
`parseRoute`-mirroring logic for string and RegExp matchers is unchanged, and RegExp matchers
are still asserted `^`-anchored.

Strictly stronger: `!sameOrigin` returns true for those URLs and is rejected, while
`sameOrigin && destination === 'document'` returns false and is permitted. Shown red by
pasting `defaultCache`'s entry 19 back in: 5 of 14 tests fail, including
`every matcher evaluates to false for the Iconify origins, whatever its shape` with
`https://api.iconify.design/... as document: expected [ { …(2) } ] to deeply equal []`.

`scripts/verify-sw-no-cross-origin-routes.mjs` remains the authoritative check and is
untouched except to GAIN a control. Both the test file and `runtimeCaching.ts` now say so in
comments.

#### Re-measured headroom (the number that justifies change 1)

Probe: Chromium persistent context, one synthetic `x-forwarded-for`, against `npm run start`
on this build. Requests are attributed to the worker with Playwright's
`request.serviceWorker()`, and the same captured traffic is classified twice: `before` =
matcher-only exclusions (`/api`, `/_next/static`, `/_next/image`, `favicon.ico`), `after` =
that minus what `isStaticAssetRequest` exempts.

| Phase                        | HTTP requests | Counted **before** | Counted **after** | 429s |
| ---------------------------- | ------------- | ------------------ | ----------------- | ---- |
| Page view of `/`             | 60            | 16                 | 15                | 0    |
| Install (worker precache)    | 291           | 50                 | **1**             | 0    |
| Both, one client, one minute | 351           | **66**             | **16**            | 0    |

So headroom against the 100 req/min bucket goes from **34 to 84**, and install itself goes
from 50 counted requests to 1. The single remaining counted install request is
`/images/seals/README.md`; `.md` is not in the extension list and was deliberately not added.

Worker state after the run: `activated`, 290 of 290 precache entries cached, 0 x 429.

Two corrections to earlier numbers in this document, from the same probe:

- A page view spends **16** counted requests, not "~50". The 15 that remain after the
  exemption are all app-route documents: `/`, plus Next's link prefetches of `/about`,
  `/create`, `/food`, `/terms`, `/privacy-policy`, `/impressum`. Those are correctly counted.
- Install counts **50** before the exemption, not 51 (the earlier figure was derived from the
  manifest, this one from observed traffic).

#### Offline coverage, verified live

Same probe harness, worker activated, then `context.setOffline(true)`:

| Navigation                        | Result                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| `/food`, visited while online     | the real page, from the `pages` cache (title `Ummah Flow`) |
| `/about`, visited while online    | its cached 307, so the redirect still resolves offline     |
| `/city/berlin`, **never** visited | `/offline.html` (title `Offline - Ummah Flow`)             |

Before this change the first two gave the browser's error page. The `pages` cache held 2
entries after browsing, which is the expiration cap working as configured, not a precache.

One consequence worth naming: a cached 307 from the waitlist redirect can be served to an
offline user for up to 7 days after launch flips. Online users always hit the network first
(NetworkFirst), so this only affects offline navigations, and the cap bounds it.

#### Verification record for the two additions

| Check                                                                      | Result                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx next build --webpack && npm run build:sw` (CI's exact line)           | PASS. 290 URLs / 15.6 MB precached, all three guards green, including the new `/food` document control                                                                                                      |
| New `/food` document control, route **removed**                            | **RED as designed** — `FAIL: public/sw.js did not intercept a document request to https://ummahflow.com/.`, exit 1                                                                                          |
| New `/food` control, **old root-only `matcher: '/'` route** in its place   | **RED as designed**, and this is the point: the `/` control passes, `/food` fails, with `Note: the control for / passed and this one did not ... root-only`                                                 |
| New `/food` control, document route present                                | GREEN — `(control) https://ummahflow.com/food INTERCEPTED for a document request, as it must be`                                                                                                            |
| Part 1 app-route control, **negation removed** (`} else if (isStatic...)`) | **RED as designed** — 8 tests fail, all four app routes report `expected +0 to be 20`                                                                                                                       |
| Part 1 shadowing test, predicate **broadened to `startsWith('/images')`**  | **RED as designed** — `/images must not be treated as an asset: expected true to be false`                                                                                                                  |
| `pwa-config.test.ts` with `defaultCache` entry 19 pasted back in           | **RED as designed** — 5 of 14 fail, including the new behavioural assertion at `destination: document`                                                                                                      |
| `279-trusted-client-ip.test.ts`                                            | PASS, 12 tests (was 2)                                                                                                                                                                                      |
| `pwa-config.test.ts`                                                       | PASS, 14 tests (was 12)                                                                                                                                                                                     |
| `plan211-map-tiles-iphone.test.ts`                                         | PASS, 3 tests (unaffected: it filters for RegExp matchers only)                                                                                                                                             |
| `plan123-iteration2-middleware-profile-exemption.test.ts`                  | PASS, 4 tests                                                                                                                                                                                               |
| `CI=1 npx playwright test` (full suite)                                    | PASS, 7 passed in 15.4s, including `sw-session-boundary` and `pwa`                                                                                                                                          |
| `npx tsc --noEmit`                                                         | PASS                                                                                                                                                                                                        |
| `npm run lint`                                                             | PASS, 0 errors, 132 warnings (unchanged baseline)                                                                                                                                                           |
| `docker build`                                                             | NOT run, and not needed: neither `Dockerfile` nor `.dockerignore` is touched. The image builds through `build:standalone`, which already chains `build:sw`, and all three guards run inside the image build |

Not committed, as instructed: `public/sw.js` (gitignored) and `public/manifest.json` (no
churn produced). The two throwaway probes live in `/tmp`, not the repo.

## Decisions

| #   | Decision                           | Choice                                                                                                        | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Target mode                        | Configurator mode, not `@serwist/turbopack`                                                                   | Keeps `swDest` at `public/sw.js`, so the Dockerfile copy, the verify script, the UAT check and the registration call all survive (request 280, Q4)                                                                                                                                                                                                                                                                                                          |
| 2   | Version pinning                    | Exact, no caret                                                                                               | Org guardrail; the existing `^10.2.9` caret is a known deviation                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | `defaultCache`                     | Never imported, not even for dev                                                                              | Entries 19 and 20 both match cross-origin Iconify; entry 19 is byte-identical to the next-pwa route behind incident 046. The dev branch is worse: a lone dot-star NetworkOnly                                                                                                                                                                                                                                                                               |
| 4   | Push handler                       | Imported from the worker entry, bundled by esbuild; file moved to `src/lib/pwa/`                              | `importScripts` throws in a module worker and keeps `/sw-push-handler.js` as a cacheable HTTP resource. Bundling retires the nginx no-cache dependency entirely                                                                                                                                                                                                                                                                                             |
| 5   | Registration                       | Keep `ServiceWorkerRegistration`, drop `SerwistProvider`                                                      | The provider registers `type: "module"`, monkey-patches `history.pushState`/`replaceState` and adds `online -> location.reload()`. Request 281 existed to remove a forced reload                                                                                                                                                                                                                                                                            |
| 6   | Registration gate                  | `NODE_ENV === 'production'`, not hostname                                                                     | `e2e/sw-session-boundary.spec.ts` runs a production build against `127.0.0.1` and requires a worker there. A hostname gate breaks it and confines all local validation to Docker                                                                                                                                                                                                                                                                            |
| 7   | `registrations.length === 0` guard | **Kept** (dropped, then restored after CI)                                                                    | Reversed. `register()` runs an update check that refetches `/sw.js`, and this effect runs on every mount of the root layout, so dropping it spent one extra request per page view of every real user's 100 req/min budget. Request 281's four-arm fixture proved the guard costs nothing: all four arms picked up a bumped worker, including the arm that never calls `register()` again, because the browser soft-updates an in-scope worker on navigation |
| 7b  | `precachePrerendered`              | `false`                                                                                                       | `@serwist/next` defaults it true and precaches every prerendered page, which next-pwa never did: 54 -> 112 middleware-counted install requests against a 100 req/min bucket, so install 429s and the worker never activates. Parity, and the actual fix for the CI 429                                                                                                                                                                                      |
| 8   | `DevServiceWorkerReset`            | Deleted                                                                                                       | A second blind unregister-every-worker-and-wipe-every-cache effect. With registration gated on `NODE_ENV === 'production'`, dev never holds a worker, so it has nothing to clean. Keeping it is exactly the "remediation that outlives its cause" pattern request 281 documented                                                                                                                                                                            |
| 9   | Firefox ETP spec                   | Not written                                                                                                   | The three Iconify domains are on none of the lists ETP classifies by, and a Firefox 155 reproduction returned 200 with ETP on and off. The spec would pass whether or not the bug was present                                                                                                                                                                                                                                                               |
| 10  | Iconify guard                      | `node:vm` execution of the built `sw.js`, asserting `respondWith` is never called                             | Tests the property that is actually true, on the artifact that actually ships, with no dependency on esbuild's minifier output shape. Shown failing against two deliberately-wrong builds                                                                                                                                                                                                                                                                   |
| 11  | `--webpack`                        | Kept on all 7 scripts                                                                                         | Turbopack cannot build this repo (swagger-client / js-yaml). Unrelated to the PWA. See "What did not get done"                                                                                                                                                                                                                                                                                                                                              |
| 12  | `cacheStartUrl` / offline fallback | Restored, parity only: `matcher: '/'` -> `NetworkFirst({ cacheName: 'start-url' })`. **SUPERSEDED by 15**     | Reviewer decision after the gap was flagged. It is the only route that handles a document request, so it is the only thing that lets `fallbacks` fire. NOT broadened to `request.destination === 'document'`: that changes navigation caching app-wide, so it is a follow-up                                                                                                                                                                                |
| 13  | browserslist override              | Exact pin, `4.29.1`                                                                                           | `>=4.28.7` is unbounded and violates the dependency guardrail. 4.29.1 was 8 days old at pin time with no OSV advisory                                                                                                                                                                                                                                                                                                                                       |
| 14  | Start-url matcher shape            | The string `'/'`, not a function matcher. **SUPERSEDED by 16**                                                | Byte-for-byte what next-pwa emitted, and `parseRoute` resolves a string against `location.href` and compares exact hrefs. Keeps the structural "no function matcher" property that rules out `defaultCache`'s `({ sameOrigin }) => !sameOrigin`                                                                                                                                                                                                             |
| 15  | Offline coverage scope             | Widened to every same-origin document, via runtime `NetworkFirst('pages')`, 50 entries / 7 days / 10s timeout | Reviewer decision, taking the follow-up decision 12 deferred. Chosen over `precachePrerendered: true`, which buys the same coverage by downloading 61 HTML documents into every first-time visitor's cache on install, which is exactly what broke install. Runtime caching covers the pages a user actually visited, at zero install cost                                                                                                                  |
| 16  | Function-matcher ban               | Replaced by the behavioural property it stood in for                                                          | Decision 15 needs a function matcher. Every matcher, whatever its shape, must evaluate to `false` for the three Iconify origins at three `request.destination` values. Strictly stronger than the syntactic ban: it still rejects `({ sameOrigin }) => !sameOrigin` (shown red) and permits `sameOrigin && destination === 'document'`                                                                                                                      |
| 17  | Static-asset rate limiting         | Exempt from the non-API bucket, matched by file extension, inside the handler                                 | Reviewer decision, taking follow-up 8. `_next/static` and `_next/image` were already fully exempt via the matcher; files in `public/` are the same class. In-handler so the predicate is unit-testable, by extension rather than directory prefix so it cannot shadow a future `/images` page. No limit raised, nothing else exempted. Install goes from 50 counted requests to 1                                                                           |

## Follow-up requests

### 1. `/api-docs` is probably broken at runtime today, and `swagger-client` blocks Turbopack

Treat this as a **runtime bug report for `/api-docs` first**, and only secondarily as the
build-flag blocker. Two problems, one cause.

The chain: `src/app/api-docs/page.tsx` -> `swagger-ui-react@5.33.0` -> `swagger-client@3.38.2`,
which does `import jsYaml from 'js-yaml'` in five places. **js-yaml removed its ESM default
export in 4.2.0** (`4.1.0`'s `dist/js-yaml.mjs` has `export default jsYaml`; `4.3.2` and
`5.4.2` do not), yet `swagger-client@3.38.2` declares `js-yaml: ^4.3.2`, so it is broken
against its own declared range.

- **webpack** tolerates it and yields `undefined`, with a warning on every build
  (`Attempted import error: 'js-yaml' does not contain a default export`, 7 occurrences,
  visible in this request's build output). So the Swagger YAML path is **very likely already
  broken at runtime**, silently. Nobody has loaded `/api-docs` and exercised YAML parsing to
  confirm the user-visible symptom; do that first, it is cheap and it decides the priority.
- **Turbopack** enforces ESM semantics and hard-errors:
  `Export default doesn't exist in target module`, 5 errors, build fails.

Dead ends already tried, do not repeat them:

- Pinning js-yaml to 4.1.0 restores the default export but reintroduces GHSA-mh29-5h37-fv8m
  plus 4 more advisories covering 4.0.0-4.3.1. Violates the dependency guardrail.
- `turbopack.resolveAlias` pointing js-yaml at its CJS entry had **no effect**: the importers
  are inside `node_modules`, and `dist/js-yaml.cjs.js` is not an exported subpath.
- `swagger-ui-react@5.33.1` is the latest and still depends on `swagger-client@3.38.2`.

Options: drop `swagger-ui-react` for a lighter viewer, serve Swagger UI from a CDN bundle, or
move `/api-docs` out of the Next build entirely.

### 2. Remove `--webpack` from the 6 non-`analyze` scripts

Blocked only by follow-up 1. The PWA no longer needs webpack at all: `serwist build` reads
`.next/` and `public/` off disk, so the bundler is irrelevant to whether `public/sw.js` is
emitted. `next.config.js` already carries the `turbopack: {}` key Next 16 demands alongside a
`webpack()` function, and the `@svgr/webpack` landmine is gone. It is a one-token edit per
script: `dev`, `build`, `build:raw`, `build:standalone`, `build:production`, `build:local`.

`analyze` keeps `--webpack` permanently: `next.config.js:422-425` wraps
`@next/bundle-analyzer`, which is a webpack plugin. `npm run analyze` was run and passes (see
the verification record), so that entry point is known-good as the one deliberate holdout.

### 3. One-shot cleanup of the stale `workbox-precache-v2-*` cache (~18 MB per client)

Serwist precaches under `serwist-precache-v2-<scope>`; the old Workbox worker used
`workbox-precache-v2-<scope>`. `cleanupOutdatedCaches` only matches the **current** prefix, so
every already-installed client keeps the old ~18 MB cache forever after this migration.

The fix must be **name-targeted and one-shot, keyed to a durable versioned marker in
`localStorage`**. Concretely: delete only cache names matching the known old prefix, once, and
record that it ran under a versioned key (e.g. `uflow:sw-cleanup:v1`) so it never runs again.

It must **NOT** be a blind `caches.keys().forEach(delete)`. That is precisely the bug request
281 removed, and learning 281 records why `sessionStorage` cannot express "once": it is
dropped at every session boundary, so the cleanup re-ran forever, wiping the precache and
forcing a reload on every returning visit. `localStorage` plus a version in the key is what
expresses "once, for this migration only".

### 4. The nginx `/sw-push-handler.js` no-cache blocks are dead config

`public/sw-push-handler.js` moved to `src/lib/pwa/sw-push-handler.js` and is bundled into
`public/sw.js` by esbuild, so nothing fetches `/sw-push-handler.js` any more (confirmed: it
404s in the built image). `deploy/nginx/nginx-template.conf` and
`deploy/nginx/nginx-uat-template.conf` still carry `location = /sw-push-handler.js` no-cache
blocks, and `src/__tests__/config/nginx-config.test.ts` still guards them with 8 passing
tests. Nothing is broken; the config and its 8 tests now protect a URL nobody fetches. Remove
both together, not the config alone.

### 5. ~~The offline fallback only covers `/`~~ DONE in this request

Closed by the pre-merge addition above (decision 15). The same-origin document route makes
`/offline.html` reachable from every navigation, and a visited page is served from the
`pages` cache instead. Verified live: offline `/food` serves the real page, offline
`/city/berlin` (never visited) serves `/offline.html`.

### 6. Add `agent-output/` to `.dockerignore`

It excludes `*.md` and `docs/` but not `agent-output/`, so debug harnesses and ~463KB of PNGs
enter the Docker build context. Pre-existing, affects 28 other PNGs.

### 7. Tighten the remaining unbounded `overrides` ranges

`overrides` still carries ten unbounded `>=` ranges at the top level (`dompurify`, `js-yaml`,
`minimatch`, `immutable`, `serialize-javascript`, `lodash`, `picomatch`, `brace-expansion`,
`fast-uri`, `yaml`) plus a nested `next.sharp: ">=0.35.0"`.
Unbounded ranges violate the dependency guardrail, and `"js-yaml": ">=4.3.0"` is what
floated js-yaml from the intended 4.3.x to 5.4.2. `browserslist` was pinned exactly in this
request; the rest were left alone to keep the diff reviewable.

### 8. ~~The precache budget and the rate limiter still sit close together~~ DONE, with one

part left

Closed by the pre-merge addition above (decision 17): static-asset paths are exempt from the
non-API bucket, so install goes from 50 counted requests to 1 and a first visit's total goes
from 66 to 16 against the ceiling of 100.

The second candidate fix is still open and now cheap: add a budget guard to
`scripts/verify-pwa-output.js` that counts manifest entries the middleware would still COUNT
(i.e. extensionless ones) and fails above a small threshold. Today that number is 1
(`/images/seals/README.md`), so a threshold of, say, 10 is nowhere near flaky, where a
threshold near the old 50 would have been.

### 9. The API rate-limit branch in `src/middleware.ts` is dead code (SECURITY, own request)

**Flagging, not fixing.** The matcher at `src/middleware.ts:135-140` is
`'/((?!api|_next/static|_next/image|favicon.ico).*)'`, so middleware **never runs for API
routes at all**. That makes the entire `isApiRoute` branch at `src/middleware.ts:88-110`,
including `API_RATE_LIMIT_MAX_REQUESTS = 30`, unreachable: every `X-RateLimit-*` header it
sets and every 429 it returns are code that cannot execute.

Nothing is exposed today. The sensitive endpoints got their own route-level limits in request
279, and those are what actually run. But a _generic_ API route added tomorrow gets **no
middleware rate limiting whatsoever**, while the code reads as though it does, which is the
worse half of the problem: the next person adding an endpoint will reasonably assume a
baseline 30 req/min applies.

Worth its own request because the fix is a real decision, not an edit: either include `api`
in the matcher (which turns 30 req/min on for every endpoint at once, and needs the existing
route-level limiters checked for double counting), or delete the dead branch and make the
per-route limiter the documented and only mechanism. Deleting it is not obviously wrong, but
it should be deliberate and it should come with a lint or test that catches an unprotected new
endpoint.

Worth noting alongside: the in-memory `rateLimitStore` is per-process, so neither mechanism
holds across instances. Already known; not new here.

### 10. Drop the redundant `verify-pwa-output.js` call in `e2e.yml`

`.github/workflows/e2e.yml:48` runs `npm run build && node scripts/verify-pwa-output.js`.
`postbuild` already ran `build:sw`, which runs that script plus the other two guards, so the
trailing call is a duplicate. One-line removal, left alone here to keep this diff about the
three CI failures.

## Learnings

Captured in `docs/ai/LEARNINGS.md` as entry 282:

1. A drop-in default config from a forked library carries the forked library's bugs.
   Serwist's `defaultCache` entry 19 is byte-identical, down to `maxEntries: 32` and
   `networkTimeoutSeconds: 10`, to the `@ducanh2912/next-pwa` route that two post-mortems
   were written about. Serwist is a Workbox fork by the same author.
2. A documented root cause can be folklore. The "Firefox ETP" mechanism was cited in four
   files for six months and is unverified. The fix being right does not make the
   explanation right.
3. Moving artifact generation out of `next build` and into an npm lifecycle hook silently
   breaks every pipeline step that invokes the binary directly, because npm hooks do not fire
   for `npx next build`. Verifying through `npm run build` is exactly what hid it.
4. "Parity" has to include the new library's own defaults, not just the options you ported.
   `precachePrerendered: true` was never written anywhere and still doubled the install-time
   request count into a rate-limited bucket.
5. A rate limiter that counted `public/` files while the matcher already exempted
   `_next/static` was miscategorising, not reporting. The test that distinguishes that fix
   from a bypass is the control's own: drive the app routes past the ceiling from one IP and
   prove the 429 still happens. Observed red twice, under an inverted negation and under a
   directory-prefix predicate.
6. A guard that bans a SHAPE to exclude a BEHAVIOUR expires the moment you need that shape.
   `expect(typeof matcher).not.toBe('function')` existed to keep out
   `({ sameOrigin }) => !sameOrigin` and could not tell it apart from
   `sameOrigin && destination === 'document'`. Asserting the behaviour (every matcher must be
   false for the Iconify origins) is shorter and strictly stronger.
