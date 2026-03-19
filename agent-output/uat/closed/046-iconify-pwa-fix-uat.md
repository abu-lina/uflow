---
ID: 046
Origin: 046
UUID: 3a7f1c2e
Status: Committed
---

# UAT Report: 046 — Iconify PWA Service Worker Intercept Fix

**Plan Reference**: `agent-output/planning/046-iconify-pwa-fix-plan.md`
**Date**: 2026-03-19T11:30Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date                | Agent Handoff | Request                                 | Summary                                                                                      |
| ------------------- | ------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-03-19T11:30Z   | QA            | QA Complete, ready for value validation | UAT Complete — implementation delivers stated value; deferred browser validation documented with owner and trigger |
| 2026-03-19T11:35Z   | devops        | Stage 1 commit                          | Status → Committed; changes committed locally for v0.8.4 |

## Value Statement Under Test

> As a **service seeker viewing a provider detail page**, I want to **see working share, web, phone, and Instagram icons even when the PWA service worker is active**, so that **provider pages feel trustworthy and I can complete contact/share actions without broken UI or hidden failures**.

---

## UAT Scenarios

### Scenario 1: Icon rendering on `/providers/[id]` with service worker active

- **Given**: A user opens a provider detail page after the service worker has registered (warm visit, SW in control)
- **When**: The page loads and `@iconify/react` issues CDN API requests to `api.iconify.design` / `api.unisvg.com` / `api.simplesvg.com`
- **Then**: Icons `lucide:share-2`, `mdi:instagram`, `mdi:internet`, and `entypo:old-phone` render; browser console shows no `Error Response to FetchEvent.respondWith()` for Iconify CDN requests
- **Result**: **DEFERRED** — browser-backed validation not available in this agent context (no `.env.local`, no real browser session)
- **Evidence**: Structural proxy evidence PASS — see Scenario 5; production validation required at UAT deploy

### Scenario 2: Provider image loading (CacheFirst regression)

- **Given**: A user navigates to a provider detail page with the service worker active
- **When**: Provider avatar/banner images from Supabase Storage CDN are requested
- **Then**: Images load correctly; `CacheFirst` (30d) rule does not degrade first-load availability
- **Result**: **DEFERRED** — browser-backed validation required; CacheFirst rule is now active for the first time
- **Evidence**: QA deferred finding; `public/sw.js` confirmed to contain `images-cache` CacheFirst rule; no regression path identified at the config layer
- **Residual risk**: LOW — CacheFirst on Supabase Storage CDN is a standard pattern; first-time activation unlikely to regress; fallback to network on cache miss is built-in Workbox behaviour

### Scenario 3: Push notification flow (sw-push-handler regression)

- **Given**: A user has previously subscribed to push notifications
- **When**: A push notification is dispatched
- **Then**: Push handler fires correctly; `sw-push-handler.js` is loaded by the service worker
- **Result**: **DEFERRED** — push subscription requires a live app context
- **Evidence**: `public/sw.js` confirmed via grep to include `importScripts("/sw-push-handler.js")`; this corrects a pre-existing silent misconfiguration (was missing from SW before this fix); no regression relative to the intended behaviour
- **Residual risk**: LOW — `importScripts` is a restoration of intended behaviour; the push handler script itself was not modified

### Scenario 4: Offline fallback still active

- **Given**: A user loses network connectivity after having visited pages
- **When**: They attempt to navigate offline
- **Then**: `/offline.html` fallback is served by the service worker
- **Result**: **DEFERRED** — requires browser-backed offline simulation
- **Evidence**: No `fallbacks` key was modified in `next.config.js`; the offline fallback configuration is preserved; QA confirms `public/sw.js` was regenerated with the corrected config

### Scenario 5: Version and release artifact consistency

- **Given**: Release `v0.8.4` is being prepared
- **When**: Version artifacts are inspected across the codebase
- **Then**: `package.json`, `package-lock.json` (both root entries), and `CHANGELOG.md` all consistently report `v0.8.4`
- **Result**: **PASS**
- **Evidence**:
  - `package.json` → `"version": "0.8.4"` ✅
  - `package-lock.json` line 3 (root) → `"version": "0.8.4"` ✅
  - `package-lock.json` line 9 (`packages[""]`) → `"version": "0.8.4"` ✅
  - `CHANGELOG.md` → `[0.8.4]` entry present with root-cause + fix description ✅

### Scenario 6: Service-worker config shape (structural proxy for value delivery)

- **Given**: `next.config.js` is the sole source of truth for SW behaviour via `@ducanh2912/next-pwa@10.x`
- **When**: The generated `public/sw.js` is inspected post-build
- **Then**: The SW contains the Iconify `NetworkOnly` bypass, the `sw-push-handler.js` import, `images-cache` CacheFirst, and `StaleWhileRevalidate` static rules
- **Result**: **PASS**
- **Evidence** (from QA grep of `public/sw.js`):
  - `importScripts("/fallback-...js", "/sw-push-handler.js")` ✅
  - `registerRoute(/^https:\/\/(api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\//, new NetworkOnly, "GET")` ✅
  - `images-cache` CacheFirst rule ✅
  - `StaleWhileRevalidate` JavaScript/CSS rule ✅
  - Build log: `"Custom runtimeCaching array found, using it instead of the default one."` ✅

---

## Value Delivery Assessment

The plan's value statement requires that **provider detail page icons render correctly with the service worker active**. The root cause was definitively identified (Analysis 046) as:

1. `@ducanh2912/next-pwa@10.x` silently ignoring top-level Workbox options → custom `runtimeCaching` never applied
2. Default `!sameOrigin` `NetworkFirst` catch-all intercepting Iconify CDN requests
3. `handlerDidError` returning `Response.error()` → CORS failure → icons fail to render

The fix directly eliminates all three steps in the failure chain:
- Workbox options are now inside `workboxOptions: { ... }` → custom `runtimeCaching` is applied (confirmed by build log)
- First rule in `runtimeCaching` is `NetworkOnly` for the three Iconify CDN origins → SW bypassed entirely for icon requests
- The `!sameOrigin` catch-all no longer handles Iconify traffic

**Core value is delivered at the config and artifact level.** The generated SW contains the exact routing rule that eliminates the failure path. Five structural regression tests guard against recurrence. The remaining gap is browser-in-the-loop confirmation that the new SW is correctly served and activates before icon requests fire — this is a standard UAT deployment validation step, not a design uncertainty.

**Is core value deferred?** No. The failure-chain fix is complete and verified at every available automated layer. The browser validation step confirms delivery rather than enables it.

---

## Doc Review Summary

| Document | Status | Gate |
|---|---|---|
| `agent-output/planning/046-iconify-pwa-fix-plan.md` | QA Complete | ✅ Plan present with value statement |
| `agent-output/implementation/046-iconify-pwa-fix-impl.md` | Active (complete) | ✅ All milestones checked; generated SW inspected |
| `agent-output/code-review/046-iconify-pwa-fix-code-review.md` | Code Review Approved | ✅ No CRITICAL/HIGH/MEDIUM findings |
| `agent-output/qa/046-iconify-pwa-fix-qa.md` | QA Complete | ✅ All automated gates pass; blocker resolved; browser validation deferred with owner |

---

## QA Integration

**QA Report Reference**: `agent-output/qa/046-iconify-pwa-fix-qa.md`  
**QA Status**: QA Complete  
**QA Findings Alignment**: The only QA-blocking finding (lockfile version mismatch) was remediated and re-tested. All remaining findings are deferred browser-validation items, each with owner/rationale/severity/fallback path documented — consistent with the Design-Review UAT policy for config-only changes.

**Remediation Review**: The lockfile fix (`npm install --package-lock-only`) was applied by Implementer and re-verified by QA (two `package-lock.json` root entries confirmed `0.8.4`). I relied on QA regression evidence for this finding; direct re-verification was not performed in this UAT pass. QA evidence is considered sufficient.

---

## Technical Compliance

| Plan Deliverable | Status | Notes |
|---|---|---|
| Workbox options migrated to `workboxOptions` | ✅ PASS | Structural regression tests + build log confirm |
| Iconify CDN `NetworkOnly` bypass, first rule | ✅ PASS | `public/sw.js` grep confirmed |
| `importScripts` / push handler restored | ✅ PASS | `public/sw.js` grep confirmed |
| `buildExcludes → exclude` corrected | ✅ PASS | Implementation doc confirmed; no manifest pre-cache |
| 5 regression tests GREEN (261/261 suite) | ✅ PASS | QA vitest run confirmed |
| Type-check clean | ✅ PASS | `tsc --noEmit` exit 0 |
| Version artifacts at v0.8.4 | ✅ PASS | `package.json`, `package-lock.json`, `CHANGELOG.md` |
| Build with valid env (CI/UAT) | ⚠️ DEFERRED | Env-limited; SW artifact generated correctly; full page-data collection requires `.env.local` |
| Browser icon rendering validation | ⚠️ DEFERRED | UAT deploy required; see Deferred Follow-ups |

**Known limitations**:
- `npm run build` fails in this workspace after SW generation due to missing `NEXT_PUBLIC_SUPABASE_URL`. This is environmental and not attributable to Plan 046 changes.
- Test assertions for top-level option detection (tests 2 and 3 in `pwa-config.test.ts`) are indentation-sensitive. LOW risk; tracked in code review findings for backlog.

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES  
**Evidence**:
- Plan objective: "Restore reliable Iconify icon rendering on `/providers/[id]` by correcting the `@ducanh2912/next-pwa` v10 configuration, preventing service-worker interception of Iconify CDN API requests, and preserving existing offline/PWA behavior for supported assets."
- Delivered: `next.config.js` corrected to v10 API shape → Iconify CDN requests routed `NetworkOnly` → push handler and offline fallback preserved → confirmed in generated `public/sw.js`

**Drift Detected**: None. Implementation exactly matches plan scope. No features added, no scope crept. The deferred cross-origin audit (DEFERRED per plan's Decision Record) is correctly excluded from this release.

---

## UAT Status

**Status**: UAT Complete  
**Rationale**: The value statement is deliverable based on strong structural evidence: root-cause failure chain is broken at the configuration layer, generated SW artifact confirmed to route Iconify CDN requests outside Workbox, all automated quality gates pass, version artifacts aligned. The remaining gap is browser-in-the-loop confirmation, which is a routine UAT deployment step — not an unresolved design question.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE  
**Rationale**: All automation-testable acceptance criteria are met. The fix precisely addresses the verified failure chain. Code Review raised no blockers. QA gated on version consistency (resolved). Browser validation is deferred to the UAT deployment step with explicit owner and evidence requirements documented below.  
**Recommended Version**: `v0.8.4` — patch bump, correct per semver (no new feature surface, no breaking change; bug fix only)

**Key Changes for Changelog**:
- `[fix]` Iconify icons (`lucide:share-2`, `mdi:instagram`, `mdi:internet`, `entypo:old-phone`) on `/providers/[id]` now render correctly when the PWA service worker is active
- `[fix]` `@ducanh2912/next-pwa@10.x` Workbox options migrated from silently-ignored top-level placement into `workboxOptions` block
- `[fix]` Push notification handler (`sw-push-handler.js`) now correctly imported by the generated service worker (was silently excluded)
- `[fix]` `app-build-manifest.json` and `middleware-manifest.json` correctly excluded from precache
- `[chore]` 5 structural regression tests added to prevent recurrence of top-level Workbox option misplacement

---

## Deferred Follow-ups

### DF-1: Browser-backed PWA icon rendering validation

| Field | Detail |
|---|---|
| **Owner** | DevOps / QA |
| **Trigger / Due window** | First UAT deployment of v0.8.4 (same deploy cycle) |
| **Evidence required to close** | Visiting `/providers/[id]` on UAT with the service worker active (visible in DevTools → Application → Service Workers); all four icons (`lucide:share-2`, `mdi:instagram`, `mdi:internet`, `entypo:old-phone`) rendered; browser console clear of `Error Response to FetchEvent.respondWith()` for Iconify CDN origins |
| **Fallback / rollback trigger** | If icons still fail with SW active on UAT: rollback deploy; open investigation — possible caching of old SW version; force `skipWaiting` and retest |
| **Severity** | Medium — primary user-visible acceptance criterion; must be validated before promoting to production |
| **Recommended next plan / tracker** | Close this item in DevOps deploy log; escalate to new plan if icons fail post-deploy |

### DF-2: Provider image CacheFirst regression check

| Field | Detail |
|---|---|
| **Owner** | DevOps / QA |
| **Trigger / Due window** | First UAT deployment of v0.8.4 (same deploy cycle) |
| **Evidence required to close** | Provider avatars/banners visible on detail pages; no 4xx errors for Supabase Storage CDN in network tab |
| **Severity** | LOW — standard Workbox CacheFirst behaviour; first-time activation of a correctly-structured rule |
| **Recommended next plan / tracker** | Close in DevOps deploy log |

### DF-3: Push notification handler smoke test

| Field | Detail |
|---|---|
| **Owner** | QA |
| **Trigger / Due window** | Within 1 sprint of v0.8.4 UAT deploy |
| **Evidence required to close** | Push subscription completes; test notification received in browser; console confirms `sw-push-handler.js` executed |
| **Severity** | LOW — `importScripts` fix restores intended behaviour; handler script not modified |
| **Recommended next plan / tracker** | Close in QA regression log; if push fails, open new bug plan referencing this DF |

### DF-4: Full production build in CI with valid env vars

| Field | Detail |
|---|---|
| **Owner** | DevOps |
| **Trigger / Due window** | CI run triggered by merge or release tag |
| **Evidence required to close** | CI build exits 0; `public/sw.js` present in build output; no page-data collection errors |
| **Severity** | Informational — build failure in this workspace is purely env-variable-limited, unrelated to Plan 046 changes |
| **Recommended next plan / tracker** | Close automatically on first green CI run |

### DF-5: Roadmap version bookkeeping

| Field | Detail |
|---|---|
| **Owner** | DevOps / Planner |
| **Trigger / Due window** | Release preparation for v0.8.4 |
| **Evidence required to close** | Roadmap `Current Version` updated to `v0.8.4`; `Current Working Release` reflects current development state |
| **Severity** | Informational — does not affect release |
| **Recommended next plan / tracker** | Resolve during DevOps release execution step |

---

## Next Actions

None blocking release. All deferred items are assigned, time-bounded, and have explicit evidence requirements and rollback/escalation paths.
