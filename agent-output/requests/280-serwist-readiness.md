---
ID: 280
Origin: 280
UUID: 8FDCBB45-E3C0-4A0A-A28F-8DA3EE273A1C
Status: Active
Type: exploration
Branch: chore/280-serwist-readiness
Worktree: ../uflow-wt/280-serwist-readiness
Created: 2026-10-02T05:34:16Z
---

# Request 280: Serwist readiness check for replacing @ducanh2912/next-pwa

## Original request

> Replace @ducanh2912/next-pwa (abandoned, last published 2024-09-18) with
> Serwist. It's what pins the repo to `--webpack`. Note @serwist/turbopack is
> on a v10 preview track and serwist#301 (Next 16 support) is still open, so
> verify readiness before committing to it.

## Classification

- **Type:** exploration (readiness gate), expected to lead into a `refactor` request
- **Route:** Explore flow (Research -> Report -> Done)
- **Confidence:** high. The migration itself is not yet actionable: the backlog
  entry explicitly conditions it on verifying Serwist's Next 16 support, so the
  implementation ask is unsettled until the research lands.

## Why this is gated

`@ducanh2912/next-pwa` is the reason all 7 build entry points carry `--webpack`.
Next 16 defaults to Turbopack, which ignores `webpack()` config and silently
drops the service worker (`scripts/verify-pwa-output.js` is the guard). So the
migration's whole value is removing `--webpack`, and that value only exists if
Serwist genuinely supports Next 16 on Turbopack. Two open questions block it:

1. `@serwist/turbopack` is on a v10 preview track, not a stable release.
2. serwist#301 (Next 16 support) is still open.

If the answer is "not ready", the correct outcome is to defer the migration and
keep `--webpack`, not to swap one broken PWA setup for another.

## Current state on main (de0add38)

- `@ducanh2912/next-pwa`: `^10.2.9` (floating caret, not pinned)
- `next`: `16.3.8`, `react`: `18.3.1`
- `--webpack` present on 7 entry points: `dev`, `build`, `build:raw`,
  `build:standalone`, `build:production`, `analyze`, `build:local`
- `scripts/verify-pwa-output.js` runs on every build script except `dev` and
  `build`

## Phases

| #   | Phase                 | Status  | Outcome   |
| --- | --------------------- | ------- | --------- |
| 0   | Tracking file created | Done    | This file |
| 1   | Research              | Done    | `agent-output/research/280-serwist-readiness.md` |
| 2   | Report                | Pending |           |
| 3   | Done / go-no-go gate  | Pending |           |

## Decisions

| #   | Decision | Choice | Rationale |
| --- | -------- | ------ | --------- |
| 1   | Gate the migration behind a readiness check rather than dispatching implementation | Research first | Backlog entry conditions the work on verifying Serwist readiness; dispatching an implementation brief on an unsettled ask risks a swap that silently drops the service worker |

## Research questions

1. Is there a stable (non-preview) Serwist release that supports Next 16?
2. What is the status of serwist#301, and does anything in it block this repo?
3. Does `@serwist/turbopack` work with Next 16.3.8 on Turbopack, or does the
   webpack-based `@serwist/next` remain the only supported path?
4. If only `@serwist/next` is viable, does the migration still remove
   `--webpack`? If not, what is the actual benefit over staying put?
5. What does the migration touch in this repo: `next.config.js` webpack hook,
   the generated service worker entry, `public/manifest.json`,
   `scripts/verify-pwa-output.js`, the 7 build scripts, and
   `DISABLE_PWA` handling in the Dockerfile and deploy workflow?

## Findings

Full write-up: `agent-output/research/280-serwist-readiness.md`.

**Verdict: GO-WITH-CAVEATS.** Both gating premises are stale.

1. `@serwist/turbopack` is on the stable `latest` dist-tag, not preview-only. Stable 9.3.0 landed
   2025-12-20; `latest` is 9.5.12 (2026-07-22). The v10 preview track is older than stable
   (last preview publish 2025-09-03) because Turbopack support was backported into 9.x.
2. serwist#301 is **CLOSED** (2025-11-22), as a duplicate of #54. #54 is still open but Turbopack
   support shipped; the maintainer just never closed the thread.
3. `@serwist/next@9.5.12` also ships **configurator mode** (`@serwist/next/config` + `@serwist/cli`),
   which is bundler-agnostic and keeps the SW at `public/sw.js`. This is the recommended target: it
   leaves `Dockerfile:76`, `scripts/verify-pwa-output.js`, `check-uat-pwa-config.sh`, and the
   `/sw.js` registration in `RootClientLayout.tsx:256` intact.
4. `--webpack` can come off 6 of the 7 entry points. `analyze` must keep it because
   `@next/bundle-analyzer` (`next.config.js:422-425`) is a webpack plugin. Two unrelated webpack
   couplings also need resolving first: `experimental.webpackBuildWorker` (`next.config.js:183`) and
   a `turbopack.rules` entry pointing at `@svgr/webpack`, which is not installed.
5. `src/__tests__/config/pwa-config.test.ts:39` asserts the literal `workboxOptions:` in
   `next.config.js`, so it breaks in the same commit that removes next-pwa. Must be rewritten.
6. No step-by-step next-pwa → Serwist migration guide exists (`/docs/next/migrate-from-next-pwa`
   is a 404), but the `DuCanhGH/next-pwa` README officially points at `@serwist/next`, and
   discussion #314 plus `/docs/next/config` carry a usable migration checklist.

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

- `@ducanh2912/next-pwa` is pinned with a floating caret `^10.2.9`, which the org
  guardrails say should be an exact version. Moot if the migration proceeds;
  worth a one-line fix if it is deferred.
- `cleanupServiceWorkers()` (`src/lib/pwa/serviceWorkerCleanup.ts`) is called
  unconditionally from `ClientProviders.tsx:60-63` with no environment gate. It
  unregisters every SW, deletes every cache, and reloads the page once per
  session, which directly fights `ServiceWorkerRegistration` in
  `RootClientLayout.tsx:237-273`. Independent of the migration.
- `RootClientLayout.tsx:253` only registers when `getRegistrations()` is empty, so
  a client that already has an `sw.js` never picks up a new one.
- `src/__tests__/config/pwa-config.test.ts` has two byte-identical CSP `describe`
  blocks (lines 80-103 and 105-128). Dedupe.
- `next.config.js:187-194` configures a `turbopack.rules` SVG loader
  (`@svgr/webpack`) that is not in `package.json` or `package-lock.json`. Dead
  config today because every build runs webpack; a trap the moment it does not.

## Learnings

_Captured after the research lands._
