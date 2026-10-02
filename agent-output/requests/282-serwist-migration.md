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

## Decisions

| #   | Decision                           | Choice                                                                              | Rationale                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Target mode                        | Configurator mode, not `@serwist/turbopack`                                         | Keeps `swDest` at `public/sw.js`, so the Dockerfile copy, the verify script, the UAT check and the registration call all survive (request 280, Q4)                                                                                                                               |
| 2   | Version pinning                    | Exact, no caret                                                                     | Org guardrail; the existing `^10.2.9` caret is a known deviation                                                                                                                                                                                                                 |
| 3   | `defaultCache`                     | Never imported, not even for dev                                                    | Entries 19 and 20 both match cross-origin Iconify; entry 19 is byte-identical to the next-pwa route behind incident 046. The dev branch is worse: a lone dot-star NetworkOnly                                                                                                    |
| 4   | Push handler                       | Imported from the worker entry, bundled by esbuild; file moved to `src/lib/pwa/`    | `importScripts` throws in a module worker and keeps `/sw-push-handler.js` as a cacheable HTTP resource. Bundling retires the nginx no-cache dependency entirely                                                                                                                  |
| 5   | Registration                       | Keep `ServiceWorkerRegistration`, drop `SerwistProvider`                            | The provider registers `type: "module"`, monkey-patches `history.pushState`/`replaceState` and adds `online -> location.reload()`. Request 281 existed to remove a forced reload                                                                                                 |
| 6   | Registration gate                  | `NODE_ENV === 'production'`, not hostname                                           | `e2e/sw-session-boundary.spec.ts` runs a production build against `127.0.0.1` and requires a worker there. A hostname gate breaks it and confines all local validation to Docker                                                                                                 |
| 7   | `registrations.length === 0` guard | Dropped                                                                             | `register()` is idempotent and is the documented update path. With next-pwa's injection gone this is the only registration path, so the guard went from redundant to harmful                                                                                                     |
| 8   | `DevServiceWorkerReset`            | Deleted                                                                             | A second blind unregister-every-worker-and-wipe-every-cache effect. With registration gated on `NODE_ENV === 'production'`, dev never holds a worker, so it has nothing to clean. Keeping it is exactly the "remediation that outlives its cause" pattern request 281 documented |
| 9   | Firefox ETP spec                   | Not written                                                                         | The three Iconify domains are on none of the lists ETP classifies by, and a Firefox 155 reproduction returned 200 with ETP on and off. The spec would pass whether or not the bug was present                                                                                    |
| 10  | Iconify guard                      | `node:vm` execution of the built `sw.js`, asserting `respondWith` is never called   | Tests the property that is actually true, on the artifact that actually ships, with no dependency on esbuild's minifier output shape. Shown failing against two deliberately-wrong builds                                                                                        |
| 11  | `--webpack`                        | Kept on all 7 scripts                                                               | Turbopack cannot build this repo (swagger-client / js-yaml). Unrelated to the PWA. See "What did not get done"                                                                                                                                                                   |
| 12  | `cacheStartUrl` / offline fallback | Restored, parity only: `matcher: '/'` -> `NetworkFirst({ cacheName: 'start-url' })` | Reviewer decision after the gap was flagged. It is the only route that handles a document request, so it is the only thing that lets `fallbacks` fire. NOT broadened to `request.destination === 'document'`: that changes navigation caching app-wide, so it is a follow-up     |
| 13  | browserslist override              | Exact pin, `4.29.1`                                                                 | `>=4.28.7` is unbounded and violates the dependency guardrail. 4.29.1 was 8 days old at pin time with no OSV advisory                                                                                                                                                            |
| 14  | Start-url matcher shape            | The string `'/'`, not a function matcher                                            | Byte-for-byte what next-pwa emitted, and `parseRoute` resolves a string against `location.href` and compares exact hrefs. Keeps the structural "no function matcher" property that rules out `defaultCache`'s `({ sameOrigin }) => !sameOrigin`                                  |

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

### 5. The offline fallback only covers `/`

Parity with the old next-pwa behaviour, and deliberately not widened in request 282. The
consequence: a user who goes offline on `/food`, `/p/[id]` or any route other than `/` still
gets the browser's error page, not `/offline.html`. Only `/` is routed, because only the
start-url route handles a document request.

Widening it means a route matching `request.destination === 'document'` (or a
`NavigationRoute`), which changes navigation caching semantics for every route in the app:
what gets cached, what is served from cache when stale, and how an SSR-dependent page behaves
on a slow network. Worth deciding deliberately rather than inheriting. Decide it as a product
question ("should the whole app have an offline page?"), not as a config tweak.

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

## Learnings

Captured in `docs/ai/LEARNINGS.md` as entry 282:

1. A drop-in default config from a forked library carries the forked library's bugs.
   Serwist's `defaultCache` entry 19 is byte-identical, down to `maxEntries: 32` and
   `networkTimeoutSeconds: 10`, to the `@ducanh2912/next-pwa` route that two post-mortems
   were written about. Serwist is a Workbox fork by the same author.
2. A documented root cause can be folklore. The "Firefox ETP" mechanism was cited in four
   files for six months and is unverified. The fix being right does not make the
   explanation right.
