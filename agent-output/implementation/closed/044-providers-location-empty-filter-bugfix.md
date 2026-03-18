---
ID: 44
Origin: 44
UUID: b7e3a921
Status: Committed
---

# Implementation — Plan 044: Providers Location Empty-Filter Bugfix

## Plan Reference

- **Plan**: [agent-output/planning/044-providers-location-empty-filter-bugfix.md](../planning/044-providers-location-empty-filter-bugfix.md)
- **Analysis**: [agent-output/analysis/closed/044-root-cause.md](../analysis/closed/044-root-cause.md)
- **Critique**: [agent-output/critiques/closed/044-providers-location-empty-filter-bugfix-critique.md](../critiques/closed/044-providers-location-empty-filter-bugfix-critique.md)
- **Target Release**: v0.8.3 (v0.8.2 was already released as the footer overlay fix)

## Date

2026-03-18T16:25Z

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-18T16:25Z | Critic → Implementer | Implementation | Initial implementation — fixes RC-1, RC-2, RC-3; all gates pass |
| 2026-03-18T15:50Z | QA → Implementer | Build gate blocker | QA found `npm run build` fails due to missing `.env.local`; Implementer investigated — pre-existing worktree limitation, not Plan 044 regression |

---

## Implementation Summary

The bug caused `/providers?location=` to silently show only the first 12 SSR-rendered providers, with infinite scroll returning zero results and any filter interaction collapsing the list to zero. Three independent defects formed a chain (RC-1/RC-2/RC-3 as documented in Analysis 044).

Two production code files were changed, one test file was updated — no database migration required.

**Version correction**: The plan targeted v0.8.2, but git history shows v0.8.2 was already released as tag `a0ca08d` (footer overlay fix). This release is v0.8.3.

---

## Value Statement Validation

> *"As a service seeker browsing providers, I want `/providers` and `/providers?location=` to return the same complete provider list when no city is selected, so that I can reliably discover all providers, paginate through results, and refine filters without silent result loss."*

✅ **Delivered**: The fix makes `/providers` and `/providers?location=` behaviorally identical — same first page, same pagination, same filter behavior. Legacy `?location=Everywhere` and `?location=Überall` URLs are also normalized to all-locations browse. The SSR-first behavior from Plan 010 is preserved without change.

---

## Milestones Completed

- [x] **M1**: Canonical location contract documented in comments on both touched files
- [x] **M2**: Client-side location resolution fixed (RC-1) in `ProvidersContent.tsx`
- [x] **M3**: API route normalization fixed (RC-2 + RC-3) in `route.ts`
- [x] **M4**: Regression coverage added (4 new test cases); existing broken-behavior assertions corrected
- [x] **M5**: Version bumped to `0.8.3`; CHANGELOG entry added

---

## Files Modified

| Path | Change | Lines Changed |
|---|---|---|
| `src/app/(public)/providers/ProvidersContent.tsx` | Replace `||` chain with `??`-based null-check that preserves `''` as LOCATION_ALL sentinel; add legacy label normalization | ~12 lines replaced |
| `src/app/api/providers/search/route.ts` | Replace `\|\| 'Everywhere'` default with `?? ''` + legacy label normalization; update JSDoc | ~5 lines replaced |
| `src/__tests__/api/providers-search.test.ts` | Update 2 existing assertions from `'Everywhere'` → `''`; add 4 new regression test cases | +44 lines |
| `package.json` | Version bump `0.8.2` → `0.8.3` | 1 line |
| `CHANGELOG.md` | Add v0.8.3 entry describing the fix | +15 lines |

## Files Created

None.

---

## Code Quality Validation

| Check | Command | Result |
|---|---|---|
| Type-check | `node_modules/.bin/tsc --noEmit` | ✅ Exit 0 |
| Tests (full suite) | `node_modules/.bin/vitest run` | ✅ 256 passed, 0 failed (32 files) |
| Delta lint | `node_modules/.bin/eslint` (4 changed files) | ✅ Exit 0 |
| Build — compilation | `npm run build` | ✅ `Compiled successfully` |
| Build — page data collection | `npm run build` | ⚠️ Fails on `/api/badges/...` routes (missing Supabase env vars — pre-existing worktree limitation, not Plan 044 regression) |

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `GET /api/providers/search` — missing `location` | `providers-search.test.ts` | ✅ Yes | ✅ Yes | `AssertionError: expected mockSearch called with ('', null, '', 0, 12), received ('', null, 'Everywhere', 0, 12)` | ✅ Yes |
| `GET /api/providers/search` — empty `?location=` | `providers-search.test.ts` | ✅ Yes | ✅ Yes | `AssertionError` (same — 'Everywhere' vs '') | ✅ Yes |
| `GET /api/providers/search` — `?location=Everywhere` | `providers-search.test.ts` | ✅ Yes | ✅ Yes | `AssertionError` (same) | ✅ Yes |
| `GET /api/providers/search` — `?location=Überall` | `providers-search.test.ts` | ✅ Yes | ✅ Yes | `AssertionError` (same) | ✅ Yes |

All 4 new tests were written and confirmed to fail before any production code was touched.

---

## Technical Details

### RC-1 Fix — `ProvidersContent.tsx`

**Before** (broken — `||` discards `''`):
```typescript
const location =
  defaultLocation || searchParams.get('location') || selectedLocation || t('search.everywhere');
```

`searchParams.get('location')` returns `""` for `?location=`, which is falsy → falls to `t('search.everywhere')` = `'Überall'`.

**After** (fixed — `??` preserves `''`):
```typescript
const rawLocationParam = searchParams.get('location'); // null | string
const normalizedUrlLocation =
  rawLocationParam === null
    ? null // param absent — fall through to context
    : rawLocationParam === 'Everywhere' || rawLocationParam === 'Überall'
      ? '' // legacy all-locations labels → LOCATION_ALL sentinel
      : rawLocationParam; // real city name or '' (LOCATION_ALL)
const location = defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? '';
```

`searchParams.get('location')` returning `""` now correctly propagates as `''` → React Query key and API param stay `''` → API receives no `?location` → DB applies no city filter → all providers returned.

### RC-2/RC-3 Fix — `route.ts`

**Before** (broken — localized fallback and no legacy normalization):
```typescript
const location = searchParams.get('location') || 'Everywhere';
```

`null` (no param) → `'Everywhere'` (wrong); `'Überall'` → `'Überall'` (wrong).

**After** (fixed):
```typescript
const rawLocation = searchParams.get('location') ?? '';
const location =
  rawLocation === 'Everywhere' || rawLocation === 'Überall' ? '' : rawLocation;
```

`null` → `''`; `''` → `''`; `'Everywhere'` → `''`; `'Überall'` → `''`; `'Berlin'` → `'Berlin'`.

---

## Test Execution Results

| Command | Result | Notes |
|---|---|---|
| `vitest run src/__tests__/api/providers-search.test.ts` (before fix, after adding tests) | 4 failed / 6 passed | Confirmed Red state — new tests fail with `AssertionError` |
| `vitest run src/__tests__/api/providers-search.test.ts` (after fix) | 10/10 passed | Green state confirmed |
| `vitest run src/__tests__/api/ src/__tests__/regression/ src/__tests__/services/providers.test.ts` | 45/45 passed | Full affected surface area |
| `vitest run` (full suite) | 256/256 passed, 0 failed (32 files) | No regressions (includes QA-added SSR page-level test) |

---

## Local Verification

Local verification: ⚠️ Blocked — `.env.local` with Supabase credentials not available in this worktree. Browser smoke verification of the 5 URL variants should be performed by UAT against the UAT environment.

### Build Gate Investigation (QA Finding Response)

QA flagged `npm run build` as failing with `BUILD_EXIT:1`. Investigation confirms:

- **Compilation phase**: ✅ `Compiled successfully` — all TypeScript/Webpack compilation passes
- **Type-check phase**: ✅ `Checking validity of types` passes
- **Page data collection phase**: ❌ Fails on `/api/badges/[badgeId]/confirm`, `/api/admin/badges/verify`, `/api/admin/badges/unverify`
- **Root cause**: Next.js executes route handlers at build time to collect page data; the badge routes import `src/lib/supabase/client.ts` which throws when `NEXT_PUBLIC_SUPABASE_URL` is missing or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a placeholder
- **Relation to Plan 044**: None — the failing routes are badge/admin routes, not the providers search route
- **Pre-existing**: This worktree has never had `.env.local` with real Supabase credentials; the earlier `BUILD_EXIT:0` was a false positive caused by piping `npm run build` through `tail` (which returns `tail`'s exit code, not the build's)
- **Resolution**: The build gate must be validated in an environment with Supabase credentials (CI pipeline or worktree with `.env.local`). This is not a blocker introduced by Plan 044.

**Evidence**: The Implementer's earlier `BUILD_EXIT:0` has been corrected in this doc. The true build status is: compilation ✅, type-check ✅, page-data collection ⚠️ (pre-existing env blocker).

---

## Outstanding Items

- **Version correction**: Plan targeted v0.8.2; actual release is v0.8.3 (v0.8.2 was already released). Planner should update the plan's Target Release field if needed for tracking purposes.
- **Deferred**: Shared normalization helper — tracked in the plan Decision Record for the next discovery-maintenance plan.
- **Build gate**: Full `npm run build` requires Supabase credentials not available in this worktree. Compilation and type-check pass. Page-data collection fails on pre-existing badge routes — not related to Plan 044. CI or credentialed worktree must validate the full build.

---

## Next Steps

QA to re-evaluate with corrected build evidence → UAT → DevOps
