---
ID: 051
Origin: 051
UUID: b7e24c1d
Status: Committed
---

# Implementation 051 — JoinHalal Alkoholverkauf Auto-Rejection

## Plan Reference

- **Plan**: `agent-output/planning/051-joinhalal-alkoholverkauf-auto-rejection-plan.md`
- **Critique**: `agent-output/critiques/051-joinhalal-alkoholverkauf-auto-rejection-critique.md` (APPROVED)
- **Target Release**: next available patch after `origin/main` version `0.8.15`, confirm at DevOps Stage 1

## Date

2026-03-23T11:50Z

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-23T11:50Z | Implementer | Plan 051 (APPROVED) | Initial implementation: `hasAlkoholverkauf()` parser function + import-time rejection logic + auto-rejected stats + 8 TDD unit tests |
| 2026-03-23T14:10Z (approx.) | Implementer | Sync to `origin/main` JoinHalal refactor | Re-applied rule on the current importer architecture: wired `hasAlkoholverkauf()` into `src/lib/import/joinhalal.ts` (dry-run/admin path) and `scripts/import-joinhalal.ts` write path; added regression tests targeting `transformPage()`; removed obsolete `src/utils/joinhalal-transform.ts` |
| 2026-03-23T14:15Z | DevOps | Stage 1 commit prepared | Version bumped to `0.8.18`, changelog updated, artifacts moved to `closed/` in preparation for local commit |

---

## Implementation Summary

**What was built:**

1. **`src/utils/joinhalal-parser.ts`** — Added `hasAlkoholverkauf(schema)` export: a pure function that checks whether a JoinHalal Schema.org record has `Halal Merkmale` containing `Alkoholverkauf` via the `additionalProperty` array. Matching is case-insensitive and whitespace-tolerant, using comma-separated value tokenization.

2. **`src/__tests__/utils/joinhalal-parser.test.ts`** — 8 new unit tests (TDD Red → Green) covering: positive match (single value), positive match (comma-separated list), negative match (other values), empty array, undefined array, no Halal Merkmale property, case-insensitive match, and whitespace handling.

3. **`src/lib/import/joinhalal.ts`** — Wired the business rule into the shared, side-effect-free JoinHalal import core (used by CLI dry-run and the admin API route):
   - Widened `review_status` type to `'pending' | 'rejected'`
   - Called `hasAlkoholverkauf(schema)` in `transformPage()` to conditionally set `review_status = 'rejected'`
   - Added `autoRejected` counter to dry-run stats and incremented it per transformed record

4. **`scripts/import-joinhalal.ts`** — Wired the business rule into the CLI write-mode pipeline:
   - Widened `ProviderUpsert.review_status` type from `'pending'` to `'pending' | 'rejected'` (per critique F-051-1)
   - Added `autoRejected` counter to write stats and incremented it per parsed record
   - Called `hasAlkoholverkauf(schema)` in `transformPageToProvider()` to conditionally set `review_status = 'rejected'`
   - Surfaced auto-rejection count in both `printDryRunReport()` and `printWriteReport()`

5. **`src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts`** — 4 regression tests targeting the shared `transformPage()` decision branch end-to-end with HTML fixtures, proving:
   - Alkoholverkauf → `review_status = 'rejected'`
   - Non-Alkoholverkauf → `review_status = 'pending'`
   - Missing additionalProperty → `review_status = 'pending'`
   - Import-bot provenance preserved regardless of review_status

**How it delivers the value statement:**

The approved plan objective was: _"As an admin, I want JoinHalal providers with `Halal Merkmale` containing `Alkoholverkauf` to be imported directly as `review_status = 'rejected'`, so that listings that violate this business rule are automatically excluded from the moderation queue and public discovery paths."_

- ✅ Providers with `Alkoholverkauf` in their `Halal Merkmale` are imported with `review_status = 'rejected'`
- ✅ Non-flagged providers continue on the existing `review_status = 'pending'` path
- ✅ Operator-visible reporting shows auto-rejected count in dry-run and write summaries
- ✅ Import-bot provenance, outreach-trigger bypass, and dedup behavior unchanged
- ✅ No schema changes, no new runtime paths, no admin UI changes

---

## Source Contract (Milestone 1)

**Source field**: Schema.org `additionalProperty` array on the business entity (`@graph[0]`)

**Encoding**: JoinHalal uses Schema.org `PropertyValue` objects:
```json
{
  "@type": "PropertyValue",
  "name": "Halal Merkmale",
  "value": "Handgeschächtet, Alkoholverkauf, Lieferung"
}
```

**Normalization rules**:
- Property name matched case-insensitively against `"halal merkmale"` after trim
- Value split on commas, each token trimmed and lowercased
- Match is exact token match against `"alkoholverkauf"` — no substring matching
- If `additionalProperty` is absent, empty, or has no `Halal Merkmale` entry: returns `false` (safe default → `pending`)

---

## Milestones Completed

- [x] **Milestone 1** — Source contract confirmed: `additionalProperty[].name === "Halal Merkmale"`, value is comma-separated tokens
- [x] **Milestone 2** — `hasAlkoholverkauf()` is applied in both:
   - `src/lib/import/joinhalal.ts` (`transformPage()` for dry-run/admin API), and
   - `scripts/import-joinhalal.ts` (`transformPageToProvider()` for write mode),
   setting `review_status = 'rejected'` when the marker is present
- [x] **Milestone 3** — `autoRejected` counter added to `ImportStats`, surfaced in both report functions
- [x] **Milestone 4** — 8 unit tests + 4 regression tests cover rejection and passing paths via TDD
- [ ] **Milestone 5** — Version bump and CHANGELOG deferred to DevOps Stage 1

---

## Files Modified

| Path | Changes | Lines |
|---|---|---|
| `src/utils/joinhalal-parser.ts` | Added `hasAlkoholverkauf()` export function (29 lines including JSDoc) | +29 |
| `src/__tests__/utils/joinhalal-parser.test.ts` | Added `hasAlkoholverkauf` to imports + 8 new test cases in new describe block | +80 |
| `src/lib/import/joinhalal.ts` | Added `hasAlkoholverkauf()` wiring in `transformPage()` and dry-run `autoRejected` counting | n/a |
| `scripts/import-joinhalal.ts` | Widened write-path `review_status` type; applied `hasAlkoholverkauf()` in `transformPageToProvider()`; added + printed `autoRejected` in write stats and reports | n/a |

## Files Created

| Path | Purpose |
|---|---|
| `agent-output/implementation/051-joinhalal-alkoholverkauf-auto-rejection.md` | This document |
| `src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts` | 4 regression tests for the shared `transformPage()` review-status decision branch |

---

## Design Decisions

### Exact Token Match (Not Substring)

The matching splits the comma-separated value string into individual tokens and checks for exact `alkoholverkauf` match after lowercasing and trimming. This prevents false positives from hypothetical values like `Kein Alkoholverkauf` (no alcohol sales) that could match a naive substring check.

### Case-Insensitive + Whitespace-Tolerant

JoinHalal's Schema.org encoding may have inconsistent casing or spacing around commas. The normalization handles both without requiring the source to be perfectly formatted.

### Pure Function in Parser Module

`hasAlkoholverkauf()` is placed in `src/utils/joinhalal-parser.ts` alongside other pure parsing functions. This keeps the business-rule check testable without Supabase mocks and consistent with the existing module boundary.

### Type Widening (F-051-1)

`ProviderUpsert.review_status` was widened from literal `'pending'` to `'pending' | 'rejected'`. This is the minimum change needed — the database enum already includes `'rejected'` (see `supabase/migrations/0000_initial_core_schema.sql`).

### Extraction of transformPageToProvider (QA remediation)

Origin/main refactored the JoinHalal importer core into `src/lib/import/joinhalal.ts` (shared between CLI dry-run and the admin API route). To keep importer-branch regression tests attached to the real decision logic, `transformPage()` is exported and tested directly via `src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts`.

### autoRejected Counter (F-051-2)

Added `autoRejected: number` to `ImportStats` and surfaced it as `Auto-rejected (alcohol):` in both dry-run and write report functions. This allows operators to see how many rows were auto-rejected at a glance without database queries.

---

## Code Quality Validation

- [x] `./node_modules/.bin/vitest run "src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts"` — 4 passed, 0 failed
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx eslint src/utils/joinhalal-parser.ts src/__tests__/utils/joinhalal-parser.test.ts src/lib/import/joinhalal.ts src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts` — 0 errors, 0 warnings
- [x] `npm run build` — Compiled successfully; page data collection fails due to pre-existing missing env vars (unrelated to this change)

---

## Value Statement Validation

**Original**: As an admin, I want JoinHalal providers with `Halal Merkmale` containing `Alkoholverkauf` to be imported directly as `review_status = 'rejected'`, so that listings that violate this business rule are automatically excluded from the moderation queue and public discovery paths.

**Implementation delivers**:
- ✅ Auto-rejection at import time via `hasAlkoholverkauf()` → `review_status = 'rejected'`
- ✅ Non-alcohol imports unchanged: continue with `review_status = 'pending'`
- ✅ Operator auditable: `autoRejected` count in dry-run and write reports
- ✅ No side effects: import-bot identity, outreach trigger bypass, dedup, category resolution all preserved
- ✅ No schema/UI/runtime changes

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `hasAlkoholverkauf()` | `joinhalal-parser.test.ts` | ✅ Yes | ✅ Yes | TypeError: (0 , hasAlkoholverkauf) is not a function | ✅ Yes |
| `transformPage()` (shared import core) | `joinhalal-alkohol-rejection.test.ts` | N/A (rebased to origin/main) | N/A (rebased to origin/main) | N/A | ✅ Yes |

TDD Gate failure output (pre-implementation):
```
FAIL  src/__tests__/utils/joinhalal-parser.test.ts > hasAlkoholverkauf > returns true when additionalProperty contains Halal Merkmale with Alkoholverkauf
TypeError: (0 , hasAlkoholverkauf) is not a function

Test Files  1 failed (1)
     Tests  8 failed | 27 passed (35)
```

---

## Test Coverage

**Unit tests** (`src/__tests__/utils/joinhalal-parser.test.ts`): 8 new tests for `hasAlkoholverkauf`

| Test Case | Assertion | Path |
|---|---|---|
| Halal Merkmale with single Alkoholverkauf value | `true` | Rejection |
| Alkoholverkauf in comma-separated list | `true` | Rejection |
| Halal Merkmale without Alkoholverkauf | `false` | Passing |
| Empty additionalProperty array | `false` | Passing |
| Undefined additionalProperty | `false` | Passing |
| No Halal Merkmale property (other props present) | `false` | Passing |
| Case-insensitive match (lowercase) | `true` | Rejection |
| Whitespace around value | `true` | Rejection |

**Existing tests**: All 27 pre-existing parser tests + 276 other tests continue to pass (311 total).

**Regression tests** (`src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts`): 4 tests for the actual `transformPage()` decision branch (shared import core)

| Test Case | Assertion | Path |
|---|---|---|
| Full HTML with Alkoholverkauf in Halal Merkmale | `review_status === 'rejected'` | Rejection |
| Full HTML with non-Alkoholverkauf Halal Merkmale | `review_status === 'pending'` | Passing |
| Full HTML with no additionalProperty | `review_status === 'pending'` | Passing |
| Rejected record preserves import-bot provenance | `user_created_id === IMPORT_BOT_UUID` | Provenance |

---

## Test Execution Results

```
Command:  ./node_modules/.bin/vitest run
Result:   311 passed, 0 failed (36 files, 1 skipped)
Duration: 6.79s
Issues:   None
```

Parser-specific:
```
Command:  ./node_modules/.bin/vitest run src/__tests__/utils/joinhalal-parser.test.ts
Result:   35 passed (35) — 27 existing + 8 new
Duration: 1.03s
Issues:   None
```

Transform-specific:
```
Command:  ./node_modules/.bin/vitest run src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts
Result:   4 passed (4)
Issues:   None
```

---

## Outstanding Items

| Item | Type | Severity | Notes |
|---|---|---|---|
| Version bump + CHANGELOG | Deferred | Low | Deferred to DevOps Stage 1 per plan Milestone 5 |
| `npm run build` page data collection | Pre-existing | N/A | Fails without `.env.local` — not caused by this change, confirmed by clean-state comparison |
| Retroactive backfill | Out of scope | N/A | Documented as out-of-scope — only new imports and re-imports are affected |

---

## Next Steps

1. QA revalidation → UAT → DevOps
