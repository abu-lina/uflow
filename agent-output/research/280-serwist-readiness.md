---
Request: 280
Phase: Research
Branch: chore/280-serwist-readiness
Researched: 2026-10-02 (UTC)
Scope: READINESS CHECK ONLY. No dependency, package.json, next.config.js, or build-script changes were made.
---

# Serwist readiness check: replacing `@ducanh2912/next-pwa`

## Verdict

**GO-WITH-CAVEATS.** Both premises in the backlog entry are now out of date: `@serwist/turbopack` has
shipped on the **stable** `latest` dist-tag since 9.3.0 (2025-12-20) and serwist#301 was **closed**
on 2025-11-22, so a stable Serwist release can build the service worker without webpack and the
`--webpack` flag can come off the Next build scripts. The caveat is that dropping `--webpack` is not
free in this repo for reasons unrelated to Serwist: `@next/bundle-analyzer` (the `analyze` script)
and `experimental.webpackBuildWorker` are webpack-only, and `next.config.js` carries a
`turbopack.rules` entry pointing at `@svgr/webpack`, a package that is not installed.

Recommended target (see Q4): **configurator mode** (`@serwist/next/config` + `@serwist/cli`), not
`@serwist/turbopack`. It is the only option that keeps the service worker at `public/sw.js`, which
is what the Dockerfile copies and what `scripts/verify-pwa-output.js` asserts.

---

## Q1. Latest stable `serwist` / `@serwist/next`, publish dates, Next 16 support

**VERIFIED** (npm registry metadata, read via `npm view`, 2026-10-02):

| Package | `latest` | Published | `preview` tag | Published |
| --- | --- | --- | --- | --- |
| `serwist` | 9.5.12 | 2026-07-22T06:10:53.499Z | 10.0.0-preview.14 | 2025-09-03T03:56:11.968Z |
| `@serwist/next` | 9.5.12 | 2026-07-22T06:10:53.229Z | 10.0.0-preview.14 | 2025-09-03T03:56:11.289Z |
| `@serwist/turbopack` | 9.5.12 | 2026-07-22T06:10:55.046Z | 10.0.0-preview.14 | 2025-09-03T03:56:15.734Z |
| `@serwist/cli` | 9.5.12 | 2026-07-22T06:10:52.396Z | 10.0.0-preview.14 | 2025-09-03T03:56:11.206Z |

Note the direction of travel: the **v10 preview track is older than the stable 9.5.x line**. The last
10.0.0-preview publish was 2025-09-03; stable 9.5.12 is 2026-07-22. Serwist 10 is stalled and the
Turbopack work was backported into 9.x instead (see Q3).

**Next 16 in `peerDependencies` (VERIFIED on the published tarball metadata, not docs prose):**

- `@serwist/next@9.5.12`: `{ "next": ">=14.0.0", "react": ">=18.0.0", "typescript": ">=5.0.0", "@serwist/cli": "^9.5.12" }`
  (`@serwist/cli` and `typescript` are `optional: true` in `peerDependenciesMeta`)
- `@serwist/turbopack@9.5.12`: `{ "esbuild": ">=0.25.0 <1.0.0", "esbuild-wasm": ">=0.25.0 <1.0.0", "next": ">=14.0.0", "react": ">=18.0.0", "typescript": ">=5.0.0" }`
  (`esbuild`, `esbuild-wasm`, `typescript` are `optional: true`)
- `serwist@9.5.12`: `{ "typescript": ">=5.0.0" }`

So **no package declares "Next 16" explicitly**; the range is open-ended `>=14.0.0`, which admits
16.3.8 without a peer warning. The stronger signal is that both packages pin `next: "16.2.10"` in
their own `devDependencies` at 9.5.12, i.e. upstream builds and tests against Next 16.
This repo's `react: ^18.3.1` satisfies `react >=18.0.0`, and `typescript 5.5.4` satisfies `>=5.0.0`.
`engines.node` on `@serwist/turbopack` is `>=18.0.0`; this repo requires `>=22.12.0`.

Sources:
- `npm view serwist --json`, `npm view @serwist/next --json`, `npm view @serwist/turbopack --json`,
  `npm view @serwist/cli --json` (registry `dist-tags`, `time`, `peerDependencies`,
  `peerDependenciesMeta`, `devDependencies` fields)

---

## Q2. State of serwist#301

**VERIFIED. CLOSED.** <https://github.com/serwist/serwist/issues/301>

- Title: `[Feature request]: Support next.js 16`
- Opened 2025-11-05T11:07:58Z, **closed 2025-11-22T03:56:46Z**
- Closing comment, maintainer `DuCanhGH` (MEMBER), 2025-11-22T03:56:46Z:
  > "Closing this as a duplicate of #54. Thanks!"
  <https://github.com/serwist/serwist/issues/301#issuecomment-3565520677>

The real tracking issue is **#54 `[Feature request]: next dev --turbo support`**, opened
2024-01-27, **still OPEN** with 94 comments. Open status is misleading: Turbopack support shipped and
the maintainer simply has not closed the thread. The decisive maintainer comments:

- 2025-12-20T23:26:51Z, `DuCanhGH` (MEMBER)
  <https://github.com/serwist/serwist/issues/54#issuecomment-3678203486>:
  > "Serwist 9 now supports Turbopack. This change has been backported as Serwist 10's release is...
  > seriously prolonged, and Turbopack support doesn't need to be coupled with Serwist 10."
  Followed by the install line `npm i -D @serwist/turbopack esbuild serwist` (no `@preview` suffix)
  and a `withSerwist` / `createSerwistRoute` snippet.

- 2025-12-26T03:02:05Z, `DuCanhGH` (MEMBER)
  <https://github.com/serwist/serwist/issues/54#issuecomment-3691977894>:
  > "Serwist 9.4.0 adds the config mode, which both supports Turbopack and automatically precaches
  > prerendered routes, to `@serwist/next`. This is an alternative to using `@serwist/turbopack` as
  > is described above. See more at #314!"

- 2026-02-03T19:20:48Z, `DuCanhGH` (MEMBER)
  <https://github.com/serwist/serwist/issues/54#issuecomment-3843191498>:
  > "I forgot to mention this but this should be fixed with 9.5.3. Turns out `esbuild-wasm` is oddly
  > incompatible with Windows... Install `esbuild` and wrap your Next.js config with
  > `@serwist/turbopack.withSerwist` to fix this error. You may also want to set
  > `useNativeEsbuild: true` to enable native esbuild for Unix environments too."

- 2026-02-03T19:22:45Z, `DuCanhGH` (MEMBER), on the stale "Serwist doesn't support Turbopack"
  warning still in the codebase: <https://github.com/serwist/serwist/issues/54#issuecomment-3843200755>
  > "wait I lowkey forgot 😄 That might just explain why there are commits referencing this issue and
  > mentioning how Serwist still doesn't support Turbopack..."

Known-open rough edges still reported on #54 (**VERIFIED as reports, not reproduced here**):
- 2026-03-26, `svarup` <https://github.com/serwist/serwist/issues/54#issuecomment-4136791216>:
  `process.env.*` is not defined inside the SW, and `importScripts: [...]` fails under Turbopack with
  `Module scripts don't support importScripts()`. "both issues on tourbopack and worked on webpack."
  **This one matters here**: the repo's `next.config.js` uses `importScripts: ['/sw-push-handler.js']`.
- 2026-09-08, `nikelborm` <https://github.com/serwist/serwist/issues/54#issuecomment-5587874768>:
  the `exclude` option is webpack-only; migrating to configurator mode means re-expressing it.
- Windows-only `esbuild-wasm` breakage, fixed in 9.5.3 per the maintainer comment above. CI here is
  Linux/Docker, so not a blocker.

---

## Q3. Does `@serwist/turbopack` exist as a published package, and on which tag?

**VERIFIED. Yes, and the premise that it is preview-only is wrong.**

`npm view @serwist/turbopack`:
- `dist-tags`: `latest: 9.5.12`, `preview: 10.0.0-preview.14`
- Published versions, with dates:
  - v10 preview line (5 versions): `10.0.0-preview.10` 2025-07-22 → `10.0.0-preview.14` 2025-09-03
  - **stable 9.x line (21 versions)**: `9.3.0` **2025-12-20T23:14:33.760Z**, `9.3.1` 2025-12-26,
    `9.4.0` 2025-12-26, `9.4.1`–`9.4.4` 2025-12-26/2026-01-05, `9.5.0` 2026-01-05,
    `9.5.1`–`9.5.3` 2026-01-30, `9.5.4` 2026-02-04, `9.5.5` 2026-02-07, `9.5.6` 2026-02-13,
    `9.5.7` 2026-03-14, `9.5.8` 2026-04-29, `9.5.9` 2026-04-30, `9.5.10` 2026-04-30,
    `9.5.11` 2026-05-03, **`9.5.12` 2026-07-22T06:10:55.046Z**
- `npm i @serwist/turbopack` today resolves to **9.5.12 (stable `latest`)**, not a preview.
- Package exports at 9.5.12: `.`, `./react`, `./worker`, `./schema` (`withSerwist`,
  `createSerwistRoute`, `SerwistProvider`, `defaultCache`).

**Usable with Next 16.3.8 today?** Yes on paper (`next >=14.0.0` peer, upstream devDep `next@16.2.10`)
and documented in the stable docs at <https://serwist.pages.dev/docs/next/turbo>. **INFERRED, not
verified by execution**: nobody ran a build here (explicitly out of scope), and the docs' Turbopack
guide does not name a tested Next patch version. Reports on #54 from Nov 2025 against Next 16.0.x
mostly trace to the `esbuild-wasm` issues that 9.5.3 addressed.

Also **VERIFIED**: `@serwist/next@9.5.12` (stable) exports `./config`, i.e. configurator mode is in
the stable tag, not a preview. Documented at <https://serwist.pages.dev/docs/next/config>, which
states outright:

> "This approach also makes the integration bundler-agnostic. Since configurator mode does not depend
> on webpack internals, it works with Turbopack as well, eliminating the need for a separate
> implementation like `@serwist/turbopack`."

Backing discussion: <https://github.com/serwist/serwist/discussions/314> ("[`@serwist/next`] Config
mode", created 2025-12-26T02:37:55Z, by DuCanhGH).

Maintenance signal (deliberately **not** from `npm audit`):
- `serwist/serwist`: not archived, 1490 stars, last push 2026-07-22T06:10:59Z, 11 open issues.
  Recent commits include `chore(deps): monthly maintenance & bump TypeScript to 7.0 (#361)`
  (2026-07-22) and `chore(packages): publish packages (#362)`.
- `DuCanhGH/next-pwa`: not archived but last push **2024-09-18T18:46:42Z**; `@ducanh2912/next-pwa@10.2.9`
  published 2024-09-18, dependencies frozen at `workbox-build 7.1.1` / `workbox-webpack-plugin 7.1.0`.
- GitHub Advisory Database (`gh api /advisories?ecosystem=npm&affects=...`) returns **no** entries for
  `serwist`, `@serwist/next`, or `@ducanh2912/next-pwa`. Treat as weak evidence only; GHSA lags.

---

## Q4. Can this repo drop `--webpack`?

**Yes, as far as Serwist is concerned.** With `@serwist/next@9.5.12` in configurator mode (or
`@serwist/turbopack@9.5.12`), the service worker is built outside the bundler, so Turbopack no longer
silently drops it and the `webpack()` hook is no longer load-bearing for the PWA.

**But three non-Serwist things still pin webpack in this repo:**

1. `package.json:25`, `"analyze": "ANALYZE=true next build --webpack && node scripts/verify-pwa-output.js"`
   plus `next.config.js:422-425`, which wraps the config in `@next/bundle-analyzer` when
   `ANALYZE=true`. `@next/bundle-analyzer` is a webpack plugin (`webpack-bundle-analyzer`). **The
   `analyze` script must keep `--webpack`**, or bundle analysis stops working.
2. `next.config.js:183`, `experimental.webpackBuildWorker: true`. Webpack-only; silently ignored
   under Turbopack. Dead config after the switch, should be deleted rather than left to rot.
3. `next.config.js:187-194`, `turbopack.rules` maps `*.svg` to the `@svgr/webpack` loader, and
   **`@svgr/webpack` is not installed** (absent from `package.json` and `package-lock.json`;
   `grep -c "@svgr/webpack" package-lock.json` → 0). Today the rule is inert because every build runs
   webpack. The first real Turbopack build makes this config live.
   **INFERRED**: no `.ts/.tsx` file in `src/` imports a `.svg` module
   (`grep -rn "from '.*\.svg'" src/` → no matches), so the missing loader may never be resolved. Not
   verified by running a build.

Also webpack-only but harmless: `next.config.js:285-296`, a `webpack()` hook that sets
`config.watchOptions.ignored`. It only speeds up dev file watching.

**So: the honest answer is "yes for 6 of the 7 entry points, no for `analyze`."** `dev`, `build`,
`build:raw`, `build:standalone`, `build:production`, `build:local` can drop `--webpack`; `analyze`
cannot without also dropping `@next/bundle-analyzer`.

**Recommended mode: configurator mode, not `@serwist/turbopack`.** Reasons, all grounded in this
repo's files:
- Configurator mode writes `swDest: "public/sw.js"`. `Dockerfile:76` copies `/app/public` into the
  runner stage, and `scripts/verify-pwa-output.js:14` checks `public/sw.js`. Both keep working.
  `@serwist/turbopack` instead serves the SW from an App Router Route Handler at
  `/serwist/sw.js`, which would mean rewriting the guard script, re-pointing
  `RootClientLayout.tsx:256` (`navigator.serviceWorker.register('/sw.js')`), and trusting that the
  prerendered route handler survives `output: 'standalone'` packaging. The Dockerfile copies only
  `.next/standalone` and `.next/static` (`Dockerfile:79,82`).
- Configurator mode is a plain `serwist build` npm step, which fits the existing
  `next build && node scripts/...` shape of all 5 verified build scripts.
- The `importScripts` breakage reported under Turbopack mode
  (<https://github.com/serwist/serwist/issues/54#issuecomment-4136791216>) is avoided entirely:
  in Serwist you author `sw.ts` and `import "./sw-push-handler"` (or inline it) instead of using
  `importScripts`.

---

## Q5. Blast radius in this repo (read-only inspection)

| File | Lines | What's there today | What the migration does to it |
| --- | --- | --- | --- |
| `next.config.js` | 1-75 | `require('@ducanh2912/next-pwa').default({...})`: `dest: 'public'`, `register: true`, `disable: process.env.DISABLE_PWA === 'true'`, `fallbacks.document: '/offline.html'`, and a `workboxOptions` block with `skipWaiting`, `importScripts: ['/sw-push-handler.js']`, `exclude: [/app-build-manifest\.json$/, /middleware-manifest\.json$/]`, and 2 `runtimeCaching` routes (Supabase images CacheFirst 30d/100 entries; `https://**.{js,css}` StaleWhileRevalidate 7d/100 entries). Long comment block (11-20, 28-47) records two prior incidents: top-level workbox options being silently ignored, and an Iconify NetworkOnly route breaking Firefox ETP. | Entire block deleted. Settings move: `swSrc`/`swDest`/`additionalPrecacheEntries`/`globIgnores` → new `serwist.config.js`; `skipWaiting`, `runtimeCaching`, `fallbacks`, push handler → new `app/sw.ts`. `exclude` has no configurator equivalent; use `globIgnores` (`@serwist/cli` option list: <https://serwist.pages.dev/docs/cli>). |
| `next.config.js` | 422-425 | `module.exports = ANALYZE==='true' ? bundleAnalyzer(withPWA(nextConfig)) : withPWA(nextConfig)` | `withPWA(...)` unwraps to plain `nextConfig`; the bundle-analyzer branch stays (and keeps needing `--webpack`). |
| `next.config.js` | 183, 187-194, 285-296 | `experimental.webpackBuildWorker: true`; `turbopack.rules` → `@svgr/webpack` (not installed); `webpack()` hook setting `watchOptions.ignored` | Pre-existing webpack coupling unrelated to next-pwa. Must be resolved before `--webpack` comes off. See Q4. |
| `package.json` | 10, 14, 17, 18, 19, 25, 49 | `--webpack` on `dev`, `build`, `build:raw`, `build:standalone`, `build:production`, `analyze`, `build:local` | 6 of 7 lose `--webpack`; `analyze` keeps it. Each build script gains `&& serwist build` (configurator mode). `dev` would need `concurrently -p none 'serwist build --watch' 'next dev'` or a one-shot pre-step. |
| `package.json` | 13, 24 | `prebuild: node scripts/generate-manifest.js`; `postbuild: node scripts/verify-pwa-output.js` | Unchanged. Note the lifecycle quirk: `prebuild`/`postbuild` fire only for `npm run build` (and `build:uat`/`build:prod`, which call it). `build:raw`, `build:standalone`, `build:production`, `build:local`, `analyze` call `verify-pwa-output.js` explicitly and never run `generate-manifest.js`. The Docker build uses `build:standalone` (`Dockerfile:56`), so it relies on the committed `public/manifest.json`, not on `prebuild`. |
| `package.json` | 75 | `"@ducanh2912/next-pwa": "^10.2.9"` in `dependencies` (floating caret, against org guardrail "pin exact versions") | Removed. Replaced by `@serwist/next`, `@serwist/cli`, `serwist`, `esbuild`, `concurrently` (pinned exactly). `esbuild` already has an `overrides` entry at line 168 (`"esbuild": "0.28.1"`), inside the `>=0.25.0 <1.0.0` peer range. |
| `scripts/verify-pwa-output.js` | 1-31 | Skips when `DISABLE_PWA === 'true'` (9-12); fails if `public/sw.js` missing (16-23); fails if `public/sw.js` does not contain the string `sw-push-handler.js` (25-29). Comments name `@ducanh2912/next-pwa` and `next build --webpack` as the mechanism. | Keep the file, reword the comments and the second assertion. With Serwist the push handler is bundled by esbuild, so the literal string `sw-push-handler.js` will not survive into `sw.js`; assert on a push-handler marker instead (e.g. the `'push'` listener or a sentinel string). **This assertion will silently pass/fail wrong if left as-is.** |
| `public/manifest.json` | n/a | Git-tracked (`git ls-files public/manifest.json`), regenerated by `scripts/generate-manifest.js` (107 lines) which writes a hardcoded object: name/short_name `UFLOW`, `theme_color #589D96`, 5 icons, 2 screenshots, 4 German shortcuts | No change needed. Serwist does not own the manifest. |
| `public/offline.html` | n/a | Git-tracked; target of `fallbacks.document` | Becomes a Serwist `fallbacks.entries[]` entry in `app/sw.ts` keyed on `request.destination === 'document'`. |
| `public/sw-push-handler.js` | 1-117 | Git-tracked plain-JS SW fragment: `push` listener building a notification payload with icon/badge/actions/vibrate, `notificationclick` focus-or-open logic, `notificationclose` logging. Pulled in via `workboxOptions.importScripts` | Content stays, delivery changes: import it from `app/sw.ts` so esbuild bundles it, rather than `importScripts`. Do not rely on `importScripts` under Turbopack (see Q2). |
| `public/sw.js`, `public/workbox-*.js` | `.gitignore:70-75` | Generated, ignored (`**/public/sw.js`, `**/public/workbox-*.js`, plus `.map`s) | `workbox-*.js` entries become dead; Serwist emits only `public/sw.js` (+ map). Harmless either way. |
| `Dockerfile` | 13, 21, 56, 76, 79, 82 | `ARG DISABLE_PWA=false` → `ENV DISABLE_PWA=$DISABLE_PWA`; build runs `NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build:standalone` (line 56); runner copies `/app/public` (76), `.next/standalone` (79), `.next/static` (82) | No change needed in configurator mode, because `public/sw.js` keeps riding along in the line-76 copy. **Would** need changes for `@serwist/turbopack` (SW served from a Route Handler, not `public/`). `DISABLE_PWA` has no equivalent built into Serwist; wire it manually into `serwist.config.js` / the build script, otherwise the `verify-pwa-output.js` skip at line 9 becomes a lie. |
| `.github/workflows/deploy-hetzner.yml` | 87, 150, 204 | `DISABLE_PWA=false` as a docker build-arg (87) and as `-e DISABLE_PWA=false` on two `docker run` invocations (150, 204) | No change needed, but see the `DISABLE_PWA` note above. |
| `.github/workflows/deploy-uat.yml` | 116, 203, 258 | Same pattern: build-arg at 116, `-e DISABLE_PWA=false` at 203 and 258 | Same. |
| `scripts/deploy-uat.sh` | 69 | `--build-arg DISABLE_PWA=false` | Same. |
| `scripts/check-uat-pwa-config.sh` | 23-30, 37-38, 67, 85 | Greps container env for `DISABLE_PWA=false`; `docker exec ... ls /app/public/sw.js` and `stat` its size; `curl` `https://uat.ummahflow.com/sw.js` status; checks `cf-cache-status` on `/sw.js` | Unchanged in configurator mode (`/sw.js` path preserved). Breaks under `@serwist/turbopack` (`/serwist/sw.js`). |
| `src/components/layout/RootClientLayout.tsx` | 148, 151, 218-235, 237-273 | `DevServiceWorkerReset` (unregisters all SWs + nukes all caches, dev only); `ServiceWorkerRegistration` calls `navigator.serviceWorker.register('/sw.js')` (256), but only when `getRegistrations()` is empty (253) and hostname is not localhost/127.0.0.1 (246-247). This is a hand-rolled registration running alongside next-pwa's `register: true`. | Either keep the hand-rolled registration (configurator mode, URL unchanged) or replace it with `<SerwistProvider swUrl="/sw.js">` from `@serwist/next/react`. **The `registrations.length === 0` guard means an updated `sw.js` is never re-registered on a client that already has one**. Worth fixing while in here, but it is a pre-existing bug, not a migration requirement. |
| `src/lib/pwa/serviceWorkerCleanup.ts` + `src/components/layout/ClientProviders.tsx` | cleanup 8-70; ClientProviders 9, 60-63 | `cleanupServiceWorkers()` unregisters **every** SW and deletes **every** cache once per session (guarded by `sessionStorage['sw-cleaned-up']`), then `window.location.reload()`. Called unconditionally from a `useEffect` in `ClientProviders`, with no environment gate. | Untouched by the migration, but it actively fights `ServiceWorkerRegistration`. Flag for a separate request; any SW-behaviour verification during the migration will be confused by it. |
| `src/hooks/usePushNotifications.ts` | 56, 66, 145, 203 | Uses `navigator.serviceWorker.ready` and `.pushManager`; no next-pwa / workbox import | No change. |
| `src/utils/serviceWorkerUtils.ts`, `src/app/welcome/page.tsx` | 91 lines / import at 8 | `waitForServiceWorkerActivation` helper, used by the welcome page | No change expected (standard SW API, no next-pwa coupling). **INFERRED**: only the import and symbol were inspected, not the full helper body. |
| `src/__tests__/config/pwa-config.test.ts` | 1-128 | 7 assertions parsing `next.config.js` as **text**: requires the literal `workboxOptions:` (39); forbids `\n  runtimeCaching:` (46) and `\n  importScripts:` (52) at two-space indent; forbids `'NetworkOnly'` (68) and the escaped Iconify regex (76); plus two CSP assertions (`frame-src` must not contain Iconify domains; `connect-src` must) that are **duplicated verbatim** in two identically named `describe` blocks (80-103 and 105-128) | Assertion at line 39 **fails the moment `workboxOptions:` leaves `next.config.js`**. This test file must be rewritten in the same commit. The CSP assertions are still valid and should be kept (and de-duplicated). The Plan 046/064 intent (no cross-origin catch-all, no NetworkOnly route for Iconify) has to be re-expressed against `app/sw.ts` instead of `next.config.js`. |
| `src/components/layout/__tests__/ClientProviders.test.tsx` | n/a | Matched the `serviceWorker` grep; presumably mocks `cleanupServiceWorkers` | **COULD NOT DETERMINE** whether it asserts anything next-pwa-specific; file not read. |

### Not changing, but worth knowing

`@ducanh2912/next-pwa` currently drags 41 lockfile entries matching `workbox|next-pwa`, including two
separate vendored `workbox-build` trees with their own nested `rollup`, `ajv`, and `source-map`
copies. Removing it shrinks the dev dependency surface noticeably. Serwist pulls `@serwist/build`,
`@serwist/window`, `@serwist/utils`, `idb`, `browserslist`, `glob`, `kolorist`, `semver`, `zod 4.4.3`
instead. Note `zod 4.4.3` on the Serwist side versus `zod ^3.24.3` in this repo's `dependencies`:
two major versions coexisting in the tree, which npm handles but which is worth a glance during
implementation.

---

## Q6. Is there an official migration guide from `@ducanh2912/next-pwa` to Serwist?

**Partially. A first-party pointer exists; a step-by-step mapping does not.** Same author
(`ducanh2912` / `DuCanhGH` maintains both), so the pointer is authoritative.

**VERIFIED:**
- `DuCanhGH/next-pwa` `README.md` (fetched via `gh api repos/DuCanhGH/next-pwa/contents/README.md`):
  > "**NOTE:** If there's no specific reason to continue using `@ducanh2912/next-pwa`, consider
  > migrating to [`@serwist/next`](https://serwist.pages.dev/docs/next), a part of
  > [Serwist](https://serwist.pages.dev) (a Workbox fork)."
- `https://serwist.pages.dev/docs/next` lists `@ducanh2912/next-pwa` under "Alternatives", i.e. the
  relationship is acknowledged in both directions.
- npm maintainers: `@ducanh2912/next-pwa` → `ducanh2912 <ngoducanh2912@gmail.com>`;
  `@serwist/turbopack` → `canhdu <ducanh2912.rusty@gmail.com>`. Same person, confirming the
  "same author" premise.
- There is **no** `next-pwa` → Serwist migration page in the docs. `/docs/next/migrate-from-next-pwa`
  returns **HTTP 404**, and the docs sidebar for `@serwist/next` contains only Overview, Getting
  started, Turbopack, Configurator mode, Worker exports, plus per-option pages. The `@ducanh2912/next-pwa`
  docs site (`ducanh-next-pwa.vercel.app/docs`) has no migration page either.
- What does exist instead, and is close enough to use as the migration spec:
  - <https://serwist.pages.dev/docs/next/getting-started> (webpack path)
  - <https://serwist.pages.dev/docs/next/turbo> (Turbopack path)
  - <https://serwist.pages.dev/docs/next/config> (configurator mode, includes a before/after on build
    scripts and on removing `withSerwist` from `next.config.js`)
  - <https://github.com/serwist/serwist/discussions/314> (config mode announcement, with an explicit
    "To migrate to the config mode" checklist)
  - Option-by-option reference: <https://serwist.pages.dev/docs/next/configuring> and
    <https://serwist.pages.dev/docs/cli> (configurator mode inherits `@serwist/cli` options, not
    `@serwist/next` ones, per the config docs)

**INFERRED**: the `workboxOptions.runtimeCaching` shape used here (`urlPattern` / `handler` /
`options.cacheName` / `options.expiration`) is Workbox's, and Serwist's `runtimeCaching` keeps the
same shape (both docs use it), so the two cache routes in `next.config.js:51-72` should transfer
near-verbatim into `app/sw.ts`. Not verified against a Serwist type definition.

---

## What I could not determine

1. **Whether a Turbopack build of THIS repo actually emits a working service worker.** Running a
   build was out of scope. Every "works with Next 16" claim above is peer-range plus upstream
   devDependency plus docs plus maintainer statement, not an observed build. The only way to close
   this is a throwaway branch running `next build` without `--webpack` plus a Serwist step.
2. **The exact Next version `@serwist/turbopack@9.5.12` was tested against.** Its `devDependencies`
   say `next: "16.2.10"`; this repo is on `16.3.8`. No upstream statement about 16.3.x specifically.
3. **Whether `@serwist/turbopack`'s prerendered Route Handler survives `output: 'standalone'` plus
   this Dockerfile's selective copies** (`Dockerfile:76,79,82`). This is the main reason the
   recommendation steers to configurator mode, which sidesteps the question entirely.
4. **Whether `experimental.optimizeCss: true` (`next.config.js:179`, backed by the `critters`
   devDependency) works under Turbopack.** Not researched; it is adjacent to dropping `--webpack` but
   outside the Serwist question.
5. **Whether the dead `turbopack.rules` → `@svgr/webpack` entry actually breaks a Turbopack build.**
   The loader package is definitively absent from the lockfile (verified) and no `src/` file imports a
   `.svg` module (verified), but whether Turbopack validates the loader eagerly at config load or
   lazily on first `.svg` import was not established.
6. **Contents of `src/components/layout/__tests__/ClientProviders.test.tsx` and
   `src/utils/serviceWorkerUtils.ts`.** Both matched the `serviceWorker` grep; neither was read in
   full, so any next-pwa coupling inside them is unaccounted for.
7. **Vulnerability status beyond GHSA.** Per the repo's own standing caveat, `npm audit` was not run
   and would not be trusted. GHSA returned no advisories for `serwist`, `@serwist/next`, or
   `@ducanh2912/next-pwa`; that is an absence of evidence, not evidence of absence. The real risk with
   `@ducanh2912/next-pwa` is not a named CVE, it is that the repo has had **zero commits since
   2024-09-18** and its `workbox-build 7.1.1` tree will never be patched.

---

## Suggested next step (not performed)

Open a `refactor` request scoped to configurator mode, in this order, on its own branch:

1. Add `@serwist/next`, `@serwist/cli`, `serwist`, `esbuild`, `concurrently` (exact versions);
   remove `@ducanh2912/next-pwa`.
2. Create `app/sw.ts` (port `skipWaiting`, the 2 `runtimeCaching` routes, the `/offline.html`
   fallback, and an `import` of the push-handler code) and `serwist.config.js`
   (`swSrc`/`swDest: 'public/sw.js'`/`globIgnores` replacing `exclude`).
3. Strip the `withPWA` wrapper from `next.config.js`; resolve `webpackBuildWorker` and the
   `@svgr/webpack` rule; keep the `ANALYZE` branch on `--webpack`.
4. Rewrite `src/__tests__/config/pwa-config.test.ts` against `app/sw.ts`, and de-duplicate its two
   identical CSP `describe` blocks.
5. Update `scripts/verify-pwa-output.js`'s second assertion (the `sw-push-handler.js` string will not
   survive esbuild bundling) and wire `DISABLE_PWA` into the new build step.
6. Drop `--webpack` from the 6 remaining scripts last, and verify via `build:standalone` end to end
   in Docker before touching the deploy workflows.
