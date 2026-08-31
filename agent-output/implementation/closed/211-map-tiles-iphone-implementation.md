---
ID: 211
Origin: 211
UUID: b7e2d4f1
Status: Committed
---

# Implementation Doc — Plan 211: iPhone Map Tiles Regression Fix

## Plan Reference

- Plan: `agent-output/planning/211-map-tiles-iphone-fix.md`
- Analysis: `agent-output/analysis/closed/211-map-tiles-iphone-analysis.md`
- Critique: `agent-output/critiques/closed/211-map-tiles-iphone-critique.md` (APPROVED)
- GitHub Issue: https://github.com/abu-lina/uflow/issues/313

## Date

2026-08-16

## Changelog

| Date (UTC)        | Handoff      | Request | Summary |
| ----------------- | ------------ | ------- | ------- |
| 2026-08-16T01:20Z | Implementer  | Execute M1-M5 from Plan 211 | Implemented SW regex scope fix, removed tile crossOrigin, corrected CSP tile domain, added regression test, updated CHANGELOG and version to 0.15.13, aligned lockfile |
| 2026-08-16T03:00Z | devops       | Stage 1 commit              | Status → Committed for Release v0.15.13 |

## Implementation Summary

Implemented Plan 211 to fix iPhone Safari map tile rendering regression introduced by Plan 208.

Delivered behavior:
1. Service worker no longer intercepts OpenStreetMap tile PNG requests.
2. Leaflet tile layer no longer forces CORS mode via `crossOrigin: 'anonymous'`.
3. CSP now references the actual tile host (`tile.openstreetmap.de`).
4. Regression test suite now guards against reintroducing this exact config bug.

This directly delivers the plan value statement: iPhone users can see map streets/buildings while keeping existing pin behavior.

## Baseline & Measurements

- Baseline (from analysis): iPhone showed grey tiles at zoom with visible pins.
- Measurement mode: config + regression-test validation in this workspace.
- On-device iPhone verification: **blocked in this environment** (no device interaction in this session). QA must perform mandatory on-device validation.

## Milestones Completed

- [x] M1 — Narrow SW runtimeCaching image regex to Supabase host scope
- [x] M2 — Remove tile layer `crossOrigin: 'anonymous'`
- [x] M3 — Update CSP `connect-src` tile host `.org` -> `.de`
- [x] M4 — Add regression tests (`[pre-fix FAILS / post-fix PASSES]`)
- [x] M5 — Version artifacts (`CHANGELOG.md`, `package.json`, lockfile alignment)

## Files Modified

| Path | Changes | Lines (approx) |
| ---- | ------- | -------------- |
| `next.config.js` | Scoped image runtime cache regex to Supabase; updated CSP tile host to `.de` | ~2 |
| `src/features/search/components/SearchMap.tsx` | Removed `crossOrigin: 'anonymous'` from tile layer | ~1 |
| `CHANGELOG.md` | Added `0.15.13` fixed entry for Plan 211 | ~7 |
| `package.json` | Version bump `0.15.12` -> `0.15.13` | 1 |
| `package-lock.json` | Lockfile version alignment to `0.15.13` | generated |

## Files Created

| Path | Purpose |
| ---- | ------- |
| `src/__tests__/regression/plan211-map-tiles-iphone.test.ts` | Regression guardrails for SW regex scope, CSP tile host, and tile-layer crossOrigin |
| `agent-output/implementation/211-map-tiles-iphone-implementation.md` | Implementation artifact for Plan 211 |

## Deployment Path Audit

N/A — No deployment entrypoint files changed (`Dockerfile`, deploy scripts, workflow deploy files, nginx templates untouched).

## Code Quality Validation

- [x] `npx vitest run src/__tests__/regression/plan211-map-tiles-iphone.test.ts` — PASS (3/3)
- [x] `npm run type-check` — PASS
- [x] `npx vitest run` (full suite) — PASS (`232` files passed, `2` skipped; `1876` tests passed, `24` skipped)
- [ ] `npm run lint` — **FAIL (pre-existing unrelated repo errors)**
- [ ] `npm run build` — **FAIL (environment blocker: missing `NEXT_PUBLIC_SUPABASE_URL`)**

Notes:
- Lint failures are not introduced by Plan 211 changes; errors are in unrelated files (e.g., `src/app/api/chat/route.ts`, `src/app/(public)/chat/page.tsx`, `src/app/(public)/create/halal/page.tsx`).
- Build compiles but fails during page-data collection for `/api/admin/badges/verify` due missing env var in this worktree.

## Value Statement Validation

Original value: iPhone users must see streets/buildings when zooming search map.

Implementation supports this value by removing the two identified technical causes:
- SW no longer captures OSM tile traffic via broad `.png` matcher.
- Tile layer no longer requests CORS mode unnecessarily.

The resulting behavior is enforceable by regression tests and requires final confirmation via on-device QA.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| Plan 211 regression guardrails (config behavior) | `src/__tests__/regression/plan211-map-tiles-iphone.test.ts` | ✅ Yes | ✅ Yes | Pre-fix assertions failed: broad SW regex present, CSP `.de` absent, `crossOrigin` present | ✅ Yes |

## Test Coverage

- Unit/regression: Added focused coverage for the exact bug mechanism.
- Full suite: executed and passing in this environment.

## Test Execution Results

| Command | Result | Notes |
| ------- | ------ | ----- |
| `npx vitest run src/__tests__/regression/plan211-map-tiles-iphone.test.ts` (pre-fix) | FAIL | Expected red phase for TDD; assertions failed against pre-fix config |
| `npx vitest run src/__tests__/regression/plan211-map-tiles-iphone.test.ts` (post-fix) | PASS | 3 tests passed |
| `npm run type-check` | PASS | no TS errors |
| `npx vitest run` | PASS | 232 passed / 2 skipped files |
| `npm run lint` | FAIL | unrelated pre-existing lint issues outside Plan 211 scope |
| `npm run build` | FAIL | missing `NEXT_PUBLIC_SUPABASE_URL` env in this worktree |

## Local Verification

- Local verification: ⚠️ Blocked
- Blocker: No iPhone/Safari execution path in this environment and missing production env (`NEXT_PUBLIC_SUPABASE_URL`) for full build parity.
- Required downstream verification: QA on physical iPhone (Safari) per Plan 211 test scenarios.

## Search/Filter Client-Interaction Trace

N/A — No submit-handler, URL-param lifecycle, or mixed-entity inline-action changes in this plan.

## Multi-Plan State Audit

N/A — No React state semantic changes introduced in this plan.

## API Route Coverage Gate

N/A — No `src/app/api/**/route.ts` files changed.

## Outstanding Items

1. Full-repo lint remains failing due unrelated pre-existing issues.
2. Build gate blocked by missing required environment variable in this worktree (`NEXT_PUBLIC_SUPABASE_URL`).
3. Mandatory on-device iPhone QA still required.

## QA Handoff Notes (includes Critic F1)

Required QA scenarios for this plan:
1. iPhone Safari: initial `/search` food map load shows visible tiles.
2. iPhone Safari: zoom 17–19 retains streets/buildings (no grey fill).
3. iPhone Safari: pan repeatedly; tiles continue loading.
4. iPhone Safari: near-me toggle with geolocation still works.
5. iPhone Safari: pin tap navigates to provider detail.
6. iPhone Safari: hard refresh / reopen tab still loads tiles.
7. **Provider image regression check (Critic F1)**: open provider detail with photos and verify images load correctly (ensures Supabase-scoped SW regex did not break image handling).

## Next Steps

1. Code Review
2. QA (on-device iPhone mandatory)
3. UAT
