---
ID: 064
Origin: 064
UUID: f3a9c2d7
Status: Committed
---

# UAT Report: Plan 064 — Iconify SW CORS Fix

**Plan Reference**: No standalone plan doc; scope derived from `agent-output/implementation/064-iconify-sw-cors-fix-impl.md`
**Date**: 2026-03-29
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date | Agent Handoff | Request | Summary |
| ---------- | ---------------- | -------------------- | ------------------------------ |
| 2026-03-29T13:35Z | QA | QA Complete — all blockers resolved | UAT Complete — implementation delivers stated value; nginx no-cache fix confirmed in generated sw.js + config; CSP hygiene improvement verified; APPROVED FOR RELEASE |

## Value Statement Under Test

*Derived from Plan 046 (parent) and Plan 064 implementation scope — no standalone Plan 064 plan doc exists:*

**Primary**: As a **PWA user**, I want **push notification handler updates to take effect after each deployment**, so that **a cached `sw-push-handler.js` does not silently serve stale push logic for up to 1 year after a deploy**.

**Secondary**: As a **security-conscious operator**, I want **the CSP `frame-src` directive to contain only origins that genuinely serve iframe content**, so that **CSP is precise and not misleadingly permissive for Iconify JSON API domains that are never used as frame sources**.

## UAT Scenarios

### Scenario 1: `sw-push-handler.js` no longer permanently cached by nginx

- **Given**: A user has the PWA installed; nginx is serving from the production (`nginx-template.conf`) or UAT (`nginx-uat-template.conf`) config
- **When**: A new deployment updates `sw-push-handler.js`
- **Then**: The browser receives `Cache-Control: no-cache, no-store, must-revalidate` for `/sw-push-handler.js`, ensuring the updated handler is fetched on next service worker activation
- **Result**: PASS
- **Evidence**:
  - `deploy/nginx/nginx-template.conf` contains exact-match `location = /sw-push-handler.js` block with `no-cache` headers (Code Review FIR-1 confirmed; nginx-config.test.ts 7/7 PASS)
  - `deploy/nginx/nginx-uat-template.conf` contains same block for UAT port (nginx-config.test.ts tests cover both configs)
  - Block is placed BEFORE the generic `location ~* \.(js)$` rule (ordering verified by test + static inspection)
  - `public/sw.js` precache manifest includes `/sw-push-handler.js` with revision hash `7ac6eb2b761b71b71776c6bf03c57320` — Workbox will detect revision changes and trigger re-fetch

### Scenario 2: `sw-push-handler.js` is imported by the generated service worker

- **Given**: A production build has been run
- **When**: The service worker `sw.js` is loaded by the browser
- **Then**: `importScripts("/sw-push-handler.js")` is called, wiring the push handler into the SW scope
- **Result**: PASS
- **Evidence**: Generated `public/sw.js` confirmed to contain `importScripts("/fallback-ce627215c0e4a9af.js","/sw-push-handler.js")` (sw.js content grep, verified in Implementer phase)

### Scenario 3: Iconify icon loading is not interrupted by the service worker

- **Given**: The PWA service worker is active on a provider detail page
- **When**: `@iconify/react` makes a `fetch()` to `api.iconify.design`, `api.unisvg.com`, or `api.simplesvg.com`
- **Then**: The service worker does not cache or intercept these requests; they go directly to the network
- **Result**: PASS
- **Evidence**: Generated `public/sw.js` contains `registerRoute(/^https:\/\/(api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\//,new e.NetworkOnly,"GET")` — the same NetworkOnly bypass rule from Plan 046, confirmed present in the 0.9.9 build output

### Scenario 4: CSP `frame-src` is corrected — Iconify domains removed

- **Given**: The application CSP is built by `next.config.js` `buildCsp()`
- **When**: A browser receives the response headers for any page
- **Then**: `frame-src` does not list `api.iconify.design`, `api.unisvg.com`, or `api.simplesvg.com` (they are JSON APIs, never embedded as iframes)
- **Result**: PASS
- **Evidence**: `pwa-config.test.ts` test "frame-src does not contain Iconify API domains" PASSES; CSP frame-src value is `"frame-src 'self'"` per source code and test assertions

### Scenario 5: Iconify icon loading CSP (`connect-src`) is unaffected

- **Given**: The CSP `frame-src` cleanup was applied
- **When**: A browser parses the CSP header
- **Then**: `connect-src` still permits `api.iconify.design`, `api.unisvg.com`, and `api.simplesvg.com` so icon fetching is not blocked
- **Result**: PASS
- **Evidence**: `pwa-config.test.ts` test "connect-src retains Iconify API domains" PASSES

## Value Delivery Assessment

Both value deliverables are demonstrably delivered:

1. **Push handler staleness bug**: The exact nginx misconfiguration is fixed. The `sw-push-handler.js` file will no longer fall through to the 1-year immutable JS cache rule. This directly prevents the user-visible failure where push notifications silently break after a deployment because the browser refuses to re-fetch the handler.

2. **CSP hygiene**: `frame-src` has been trimmed to `'self'`. The Iconify domains remain in `connect-src` (correct) and `default-src` (correct). This is a net security improvement — reducing over-permissive CSP — with zero functional regression risk.

Neither fix introduces new dependencies, new abstractions, or new user-facing surfaces. Risk is minimal.

**Is core value deferred?** No. Both fixes are infrastructure-level changes verified in the build output and test suite. The deferred items (DF-1 through DF-4) are browser/live-deployment validation of *pre-existing behaviour* — they do not gate the delivery of Plan 064's specific value.

## QA Integration

**QA Report Reference**: `agent-output/qa/064-iconify-sw-cors-fix-qa.md`
**QA Status**: QA Complete (updated from QA Failed after blocker resolution)
**QA Findings Alignment**:

- [HIGH] Dirty working tree — RESOLVED (commits `7ecc9d0f` + `2bb0653d`)
- [MEDIUM] Build evidence incomplete — RESOLVED (sw.js content verified, env-gated page-data failure documented as DF-4, identical to Plan 046)

**Remediation Review**: Yes — reviewed resolution evidence directly. Working tree confirmed clean (`git status --short` → empty). sw.js content grep confirmed all 3 fix targets present.

## Technical Compliance

| Deliverable | Status |
|---|---|
| `location = /sw-push-handler.js` no-cache block in prod nginx | ✅ PASS |
| `location = /sw-push-handler.js` no-cache block in UAT nginx | ✅ PASS |
| Block placed before generic `~* \.(js)$` rule | ✅ PASS |
| `sw-push-handler.js` not given 1-year immutable cache | ✅ PASS |
| `frame-src` excludes Iconify API domains | ✅ PASS |
| `connect-src` retains Iconify API domains | ✅ PASS |
| `importScripts("/sw-push-handler.js")` in generated sw.js | ✅ PASS |
| Iconify `NetworkOnly` route in generated sw.js | ✅ PASS |
| Version bump 0.9.8 → 0.9.9 | ✅ PASS |
| Focused config tests 14/14 | ✅ PASS |
| Full suite 736 passed \| 18 skipped | ✅ PASS |
| `tsc --noEmit` clean | ✅ PASS |
| Working tree clean at HEAD `1f3b1aea` | ✅ PASS |

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**: The implementation doc accurately describes both bugs and their fixes. The generated `public/sw.js` confirms both fixes are present in the actual build output. The nginx config files contain the correct exact-match blocks. Code Review verified correctness and classified the changes as a security improvement. QA verified all automated gates pass.

**Drift Detected**: None. Plan 064 scope was narrowly defined and completely delivered. No out-of-scope changes were introduced.

## Deferred Follow-ups (Non-Blocking)

These are carried forward from Plan 046 and do not block this release:

| ID | Item | Owner | Trigger / Due Window | Evidence to Close | Risk |
|----|------|-------|---------------------|-------------------|------|
| DF-1 | Browser icon rendering on `/providers/[id]` with SW active | DevOps / QA | First UAT deploy after merge | DevTools SW active; icons render; console clear of Iconify intercept errors | LOW — same Workbox NetworkOnly rule confirmed present in sw.js since Plan 046 |
| DF-2 | Provider image CacheFirst regression | DevOps / QA | First UAT deploy after merge | Provider images visible; no 4xx for Supabase CDN | LOW |
| DF-3 | Push notification handler smoke test | QA | Within 1 sprint of UAT deploy | Push subscription completes; test notification received | LOW — sw.js importScripts confirmed present |
| DF-4 | Full build with valid Supabase env vars | DevOps | CI triggered by merge/tag | CI exits 0; `public/sw.js` present in CI output | LOW — PWA compilation confirmed; only page-data collection is env-gated |

**Reachable-path scoping**: DF-1 through DF-3 require a live deployed UAT instance with an active service worker. These states are not reachable in the current local/CI environment. DF-4 is contingent on CI having valid environment variables, which is standard for the release pipeline. None are blocking.

## UAT Status

**Status**: UAT Complete
**Rationale**: Both plan objectives are verified by the combination of generated build output inspection, static config analysis, 14 targeted regression tests, full suite (736 tests), clean tsc, and Code Review approval. The value statement is fully delivered. No objective drift detected.

## Release Decision

**Final Status**: APPROVED FOR RELEASE
**Rationale**: This is a narrow, infrastructure-only bugfix that:
- Corrects a real user-impacting defect (push handler stuck with 1-year stale cache after deploy)
- Improves security posture (precise CSP `frame-src`)
- Is verified by build output, 14 focused tests, full suite, type-check, and code review
- Has zero functional regression risk; changes are additive to an existing proven nginx pattern
- Working tree is clean; all pipeline artifacts committed

**Recommended Version**: Next available patch after current `origin/main` (DevOps to confirm at Stage 1 with `git fetch --tags`; current trajectory is `0.9.9` per `package.json`)

**Key Changes for Changelog**:
- fix(pwa): serve `sw-push-handler.js` with no-cache headers via nginx exact-match rule (prod + UAT)
- fix(csp): remove Iconify API domains from `frame-src` directive (they belong in `connect-src` only)
- bump: version 0.9.8 → 0.9.9

## Next Actions

None — implementation delivers stated value. Proceed to DevOps for push + PR + release.

Deferred items DF-1 through DF-4 (above) should be closed during the first UAT deploy window following merge.
