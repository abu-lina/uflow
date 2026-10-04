---
ID: 046
Origin: 046
UUID: 3a7f1c2e
Status: Committed
---

# Implementation 046 — Iconify PWA Service Worker Intercept Fix

**Plan Reference**: `agent-output/planning/046-iconify-pwa-fix-plan.md`
**Date**: 2026-03-19T00:00Z
**Release Target**: v0.8.4

## Changelog

| Date       | Handoff     | Request/Source       | Summary                                                                 |
|------------|-------------|----------------------|-------------------------------------------------------------------------|
| 2026-03-19 | Implementer | Plan 046 (Approved)  | Fixed `next.config.js` PWA option placement; TDD tests green; build verified |
| 2026-03-19T11:35Z | devops | Stage 1 commit | Status → Committed; changes committed locally for v0.8.4 |

---

## Implementation Summary

**What was done**: Migrated all Workbox-specific options from the (silently ignored) top level of `withPWA({...})` into `workboxOptions: { ... }` as required by `@ducanh2912/next-pwa@10.x`'s API. Added an explicit `NetworkOnly` bypass for all three Iconify CDN origins as the first `runtimeCaching` rule.

**How it delivers value**: The generated `public/sw.js` now honours the custom `runtimeCaching` array (confirmed by build log: _"Custom runtimeCaching array found, using it instead of the default one."_). Iconify API requests are routed `NetworkOnly`, bypassing the service worker cache entirely. The `!sameOrigin` NetworkFirst catch-all that was receiving those requests—and returning `Response.error()` via `handlerDidError`—is no longer present in the generated SW. Icons (`lucide:share-2`, `mdi:instagram`, `mdi:internet`, `entypo:old-phone`) on `/providers/[id]` will render correctly with the service worker active.

Secondary benefits of the fix:
- `sw-push-handler.js` is now correctly imported into the generated SW (was silently excluded)
- `app-build-manifest.json` and `middleware-manifest.json` are now correctly excluded from precache

---

## Milestones Completed

- [x] Root cause verified via library source-tracing (`context.ts`, `resolve-runtime-caching.ts`)
- [x] Plan created and approved by Critic (APPROVED, 3 LOW findings, no blockers)
- [x] TDD regression test written and confirmed RED before fix
- [x] Fix applied to `next.config.js`
- [x] TDD tests confirmed GREEN (5/5) after fix
- [x] Full test suite confirmed: 261 passed, 0 failed, 0 errors
- [x] TypeScript type-check passed clean
- [x] Production build succeeded; `public/sw.js` artifact inspected
- [x] Build log confirms custom runtime caching array is active
- [x] `public/sw.js` byte-offset inspection confirms rule ordering
- [x] `package.json` bumped `0.8.3 → 0.8.4`
- [x] `CHANGELOG.md` entry written for `[0.8.4]`

---

## Files Modified

| Path | Change | Lines Changed |
|------|--------|---------------|
| `next.config.js` | Migrated `runtimeCaching`, `importScripts`, `skipWaiting`, `buildExcludes→exclude` from top-level into `workboxOptions: { ... }`; added Iconify `NetworkOnly` bypass as first rule | ~30 |
| `package.json` | Version bump `0.8.3 → 0.8.4` | 1 |
| `CHANGELOG.md` | Added `[0.8.4]` entry with full root cause + fix description | ~12 |
| `agent-output/planning/046-iconify-pwa-fix-plan.md` | Status updated to `In Progress`; Implementer changelog row added | ~5 |

## Files Created

| Path | Purpose |
|------|---------|
| `src/__tests__/config/pwa-config.test.ts` | 5 regression tests preventing silent recurrence of the top-level option mis-placement |

---

## Code Quality Validation

| Check | Result |
|-------|--------|
| Compilation (`npm run build`) | ✅ Passed — SW artifact generated |
| Linter | N/A — config file change, no TS linting issues |
| Type-check (`npm run type-check`) | ✅ Passed — no errors |
| Full test suite (`npx vitest run`) | ✅ 261 passed, 0 failed, 32 files + 1 skipped |
| Regression tests | ✅ 5/5 passed |

---

## Value Statement Validation

**Original value statement (from Plan 046)**: _"Provider detail pages (`/providers/[id]`) display all Iconify icons correctly whether or not the service worker is active, with no regression to PWA offline capability, push notifications, or any other existing service-worker behaviour."_

**Delivered**: ✅
- Iconify CDN requests are now routed `NetworkOnly` → bypass SW cache → CDN responds directly
- Offline fallback (`/offline.html`) remains configured
- Push notification handler (`sw-push-handler.js`) is now correctly imported
- Build exclusions re-established with correct API name (`exclude`)
- No other routes changed; existing `CacheFirst` (images) and `StaleWhileRevalidate` (JS/CSS) rules preserved

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `workboxOptions` presence in `next.config.js` | `src/__tests__/config/pwa-config.test.ts` | ✅ Yes | ✅ Yes | AssertionError: expected false to be true | ✅ Yes |
| No top-level `runtimeCaching` | `src/__tests__/config/pwa-config.test.ts` | ✅ Yes | ✅ Yes | AssertionError: top-level `runtimeCaching:` found | ✅ Yes |
| No top-level `importScripts` | `src/__tests__/config/pwa-config.test.ts` | ✅ Yes | ✅ Yes | AssertionError: top-level `importScripts:` found | ✅ Yes |
| Iconify `NetworkOnly` rule present | `src/__tests__/config/pwa-config.test.ts` | ✅ Yes | ✅ Yes | AssertionError: expected false to be true | ✅ Yes |
| Iconify rule ordering (before `cacheName`) | `src/__tests__/config/pwa-config.test.ts` | ✅ Yes | ✅ Yes | AssertionError: index check failed | ✅ Yes |

---

## Test Coverage

**Unit (regression)**:
- `src/__tests__/config/pwa-config.test.ts` — 5 tests covering structural invariants of `next.config.js`

**Integration / E2E**: Deferred to QA — requires service worker registration in a browser environment to verify live icon rendering on `/providers/[id]`.

## Test Execution Results

| Command | Result | Issues | Coverage |
|---------|--------|--------|----------|
| `npx vitest run src/__tests__/config/pwa-config.test.ts` (before fix) | 5 failed ✅ (expected RED) | Intentional — TDD gate | — |
| `npx vitest run src/__tests__/config/pwa-config.test.ts` (after fix) | 5 passed ✅ | None | 100% of new regression paths |
| `npx vitest run` | 261 passed, 0 failed | None | No regression |
| `npm run type-check` | Passed ✅ | None | — |
| `npm run build` | Passed ✅ | None | sw.js artifact generated |

**SW artifact evidence** (byte offsets from `grep -bo` on `public/sw.js`):

| Token | Byte offset |
|-------|-------------|
| `sw-push-handler` | 675 |
| `start-url` (NetworkFirst, dynamicStartUrl) | 26017 |
| `iconify` | 26341 |
| `NetworkOnly` | 26404 |
| `CacheFirst` | 26488 |
| `images-cache` | 26511 |
| `StaleWhileRevalidate` | 26754 |

Build log (key line): `"Custom runtimeCaching array found, using it instead of the default one."`

---

## Outstanding Items

1. **Push notification regression (LOW)**: `sw-push-handler.js` was silently excluded from all previous SW builds. It is now correctly imported. QA should verify push subscription status and notification delivery on UAT — there is a non-zero chance of behaviour change in push flows if the handler was a no-op or missing.

2. **Supabase Storage image delivery (LOW)**: The `CacheFirst` rule for `^https://.*\.(png|jpg|jpeg|svg|gif)$` is now active (was previously silently disabled). QA should verify provider images, logos, and avatars load correctly on UAT.

3. **Version metadata lag (INFO)**: The roadmap file shows the most recent published version as `v0.8.2` but `package.json` was already at `0.8.3` before this change. DevOps should reconcile roadmap version tracking before or alongside the `v0.8.4` release.

4. **Local browser verification**: UI-layer verification (icons rendering with SW active in a browser) is deferred to QA/UAT as it requires a running PWA environment. Dev build with `DISABLE_PWA=false` or the production build artifact should be tested on a mobile device or Lighthouse PWA audit.

---

## Next Steps

1. **Code Reviewer** — review implementation delta (single config file change, test file, version bump, changelog)
2. **QA** — validate on UAT:
   - Icons render on `/providers/[id]` with SW active
   - Offline page serves correctly from SW
   - Push notifications still work (see outstanding item 1)
   - Provider images load correctly (see outstanding item 2)
3. **DevOps** — reconcile roadmap version lag (item 3), then deploy `v0.8.4` to production
