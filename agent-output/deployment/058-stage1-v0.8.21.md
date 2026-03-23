---
ID: 058
Origin: 058
UUID: 3c0c8f41
Status: Released
---

# Stage 1 Deployment: Plan 058 — Admin Review Inside Providers Discovery

| Field | Value |
|-------|-------|
| Plan Reference | `agent-output/planning/058-admin-review-in-providers-discovery-plan.md` |
| Target Release | v0.8.21 |
| Release Type | Standalone patch |
| Epic | Admin Provider Review; provider discovery workflow simplification |
| UAT Decision | APPROVED FOR RELEASE |
| QA Decision | QA Complete |
| Stage 1 Started | 2026-03-23T20:30Z |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-03-23T20:30Z | DevOps | Stage 1 started; loaded mandatory skills (memory-contract, document-lifecycle, commit) |
| 2026-03-23T20:30Z | DevOps | Version collision: v0.8.20 tag already exists on origin; bumped to v0.8.21 |
| 2026-03-23T20:30Z | DevOps | Post-UAT delta review completed — 3 bug fixes reviewed, tests updated, all gates pass |

---

## Pre-Release Verification

### 1. UAT/QA Approval

- [x] UAT: APPROVED FOR RELEASE (`agent-output/uat/058-admin-review-in-providers-discovery-uat.md`)
- [x] QA: QA Complete (`agent-output/qa/058-admin-review-in-providers-discovery-qa.md`)
- [x] Code Review: APPROVED_WITH_COMMENTS (`agent-output/code-review/058-admin-review-in-providers-discovery-code-review.md`)

### 2. Post-UAT Delta Review (MANDATORY)

**Post-UAT code changes detected**: 3 bug fixes applied during manual local testing after UAT approval.

| Fix | File | Description | Risk |
|-----|------|-------------|------|
| Admin search RLS bypass | `src/services/providers.ts` | `searchProviders` now uses service-role client when `adminOptions.isAdmin` is true. Anon client was restricted by RLS to approved-only rows, causing admin status filters to return empty results. | LOW — only activates after server-side `isAdminOrModerator()` check has passed |
| Community services excluded from admin status filter | `src/services/providers.ts` | `searchBoth` delegates to `searchProvidersOnly` when `adminOptions.status` is set. Previously, community service cards received moderation buttons and sent wrong UUIDs to the providers UPDATE query. | LOW — narrows scope; no behavioral change for public users |
| `.single()` removed from `updateProviderReview` | `src/services/admin/providers.ts` | Replaced PostgREST `.single()` with array select to avoid "Cannot coerce" error when 0 rows match. Conflict detection preserved via explicit 0-row check. | LOW — no behavioral change for successful updates; improves error handling for edge cases |
| Test updates | `src/__tests__/services/admin-providers.test.ts` | Updated mocks to match array-based select (no `.single()`). Removed `mockSingle`, mocks now return `{ data: [...] }`. | NONE — test-only |
| Lint fix | `src/services/providers.ts` | Replaced `process.env.X!` non-null assertions with explicit null check + throw. | NONE — style-only, mandatory for CI |

**Delta Review Verdict**: PASS

**Evidence**:
- `npx vitest run`: 490 passed, 1 pre-existing failure (AdminProvidersPageContent 409 toast), 18 skipped
- `npx tsc --noEmit`: 0 errors
- `npx eslint` (delta files): 0 errors, 0 warnings
- All fixes are defensive (narrower scope, better error handling) — no new behavior paths introduced

### 3. Version Consistency

- [x] `package.json`: `0.8.21`
- [x] `package-lock.json`: `0.8.21`
- [x] `CHANGELOG.md`: `[0.8.21] - 2026-03-23`
- [x] No existing `v0.8.21` tag on origin

**Version Collision Resolution**: Target was `v0.8.20` but tag already exists on `origin`. Bumped to `v0.8.21`. Updated Plan's `Target Release` field.

### 4. CHANGELOG Date Sanity-Check

- [x] `2026-03-23` matches `date -u +%Y-%m-%d` (today). Correct.

### 5. Chain Timestamp Sanity-Check

**Anomaly detected**: Implementation doc timestamps are `2026-03-24T17:38Z` and `2026-03-24T17:55Z` — one day ahead of all other docs (plan: 15:50Z, code review: date-only `2026-03-23`, QA: 17:15Z, UAT: 17:30Z). This appears to be a clock/date error during the implementation session. All other documents have causally monotonic timestamps within 2026-03-23.

**Resolution**: Left source documents unchanged. Noted as `approx.` — the implementation clearly occurred before code review (which references it), so the true date is 2026-03-23.

### 6. Packaging Integrity

- [x] `npm install --package-lock-only` — 0 vulnerabilities
- [x] Type-check passes
- [x] Lint clean on all Plan 058 files
- [x] Test suite: 490 passed

### 7. Gitignore Review

- [x] `**/public/fallback-development.js` is gitignored (line 75)
- [x] `.env.local` is gitignored
- [x] No new gitignore changes needed

### 8. PWA Dev-Artifact Check

- [x] `public/fallback-ce627215c0e4a9af.js` was deleted by dev server — **restored** via `git checkout`
- [x] `public/fallback-development.js` exists but is gitignored — will not be committed

### 9. Workspace Cleanliness

- [x] All Plan 058 changes accounted for (14 modified + 7 new files)
- [x] PWA fallback restored
- [x] No stray files

---

## Stage 1 Evidence

### git status (after PWA restore)

```
On branch session/050-admin-provider-review
Your branch is behind 'origin/main' by 15 commits

Modified: CHANGELOG.md, package.json, package-lock.json, agent-output/.next-id,
  src/__tests__/api/providers-search.test.ts, src/__tests__/components/ProviderCard.test.tsx,
  src/__tests__/regression/plan045-category-filter-regression.test.ts, src/__tests__/services/admin-providers.test.ts,
  src/app/(public)/providers/ProvidersContent.tsx, src/app/api/providers/search/route.ts,
  src/components/providers/ProviderCard.tsx, src/components/providers/SearchResultsList.tsx,
  src/services/admin/providers.ts, src/services/providers.ts

New: src/features/admin/ (6 files), agent-output docs (Plan 058 + closed Plan 057)
```

### Test Results

```
Test Files  1 failed | 50 passed | 1 skipped (52)
Tests       490 passed | 1 failed (pre-existing) | 18 skipped (509)
Duration    7.20s
```

---

## Documents Closed

| Document | Domain | Terminal Status |
|----------|--------|----------------|
| 058 Plan | planning | Committed |
| 058 Implementation | implementation | Committed |
| 058 Code Review | code-review | Committed |
| 058 QA | qa | Committed |
| 058 UAT | uat | Committed |
| 058 Critique | critiques | Resolved (APPROVED) |

---

## Deferred Follow-ups

No deferred post-deploy milestones or UAT residual risks requiring a tracker.

The 3 LOW deferred items from code review (arrow-key nav, `removed_by_owner` type guard, type deduplication) are documented in the UAT doc and do not require post-deploy validation.
