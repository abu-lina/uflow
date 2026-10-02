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

| #   | Phase                 | Status  | Outcome   |
| --- | --------------------- | ------- | --------- |
| 0   | Tracking file created | Done    | This file |
| 1   | Settle the defaultCache / Iconify question | Pending | Blocks implementation |
| 2   | Implement             | Pending |           |
| 3   | Code Review           | Pending |           |
| 4   | Docker build gate     | Pending |           |
| 5   | Done                  | Pending |           |

## Decisions

| #   | Decision | Choice | Rationale |
| --- | -------- | ------ | --------- |
| 1   | Target mode | Configurator mode, not `@serwist/turbopack` | Keeps `swDest` at `public/sw.js`, so the Dockerfile copy, the verify script, the UAT check and the registration call all survive (request 280, Q4) |
| 2   | Version pinning | Exact, no caret | Org guardrail; the existing `^10.2.9` caret is a known deviation |

## Follow-up requests

- Add `agent-output/` to `.dockerignore`. It excludes `*.md` and `docs/` but not
  `agent-output/`, so debug harnesses and ~463KB of PNGs enter the Docker build
  context. Pre-existing, affects 28 other PNGs.

## Learnings

_Captured after review and test (workflow.mdc rule)._
