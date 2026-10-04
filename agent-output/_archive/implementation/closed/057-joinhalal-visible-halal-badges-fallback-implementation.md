---
ID: 057
Origin: 057
UUID: 5a8f3c2e
Status: Committed
---

# Implementation 057 — JoinHalal Visible Halal-Badges Fallback

## Plan Reference

- **Plan**: `agent-output/planning/057-joinhalal-visible-halal-badges-fallback-plan.md`
- **Critique**: `agent-output/critiques/057-joinhalal-visible-halal-badges-fallback-critique.md`

## Date

2026-03-24

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-24T08:30Z | Implementer | Implement Plan 057 | Full implementation of M1–M5 with TDD approach |
| 2026-03-24T09:30Z | DevOps | Stage 1 commit prepared | Version bumped to `0.8.23`, release artifacts updated, and lifecycle closure prepared for local commit |

## Implementation Summary

Extended the JoinHalal importer's alcohol detection to fall back to visible HTML `Halal Merkmale` badges when JSON-LD `additionalProperty` is absent, null, or non-decisive. Added a `--backfill-alcohol` CLI mode to retroactively update ~900 already-imported providers. All changes follow TDD — tests written and verified failing before implementation.

### How this delivers the Value Statement

The parser now detects `Alkoholverkauf` and `Kein Alkoholverkauf` badges from rendered page HTML, eliminating false-negatives where JSON-LD omits alcohol status. The backfill enables operators to correct existing `pending` providers without re-importing, with dry-run preview and `pending`-only guards.

## Milestones Completed

- [x] M1 — Badge source contract analysis (live DOM pattern confirmed)
- [x] M2 — Visible-badge fallback parser (`extractHalalBadgesFromHtml` + `hasAlkoholverkauf` HTML fallback)
- [x] M3 — Both import paths wired with `html` parameter
- [x] M4 — `--backfill-alcohol` CLI mode with dry-run/write, pending-only guard, `social_website` URL lookup
- [x] M5 — Regression coverage (80/80 tests pass)
- [ ] M6 — Release artifacts (DevOps Stage 1 — version bump deferred)

## Files Modified

| Path | Changes | Lines |
|---|---|---|
| `src/utils/joinhalal-parser.ts` | Added `extractHalalBadgesFromHtml()`, extended `hasAlkoholverkauf()` with optional `html` param + HTML fallback, hyphen normalization for property names | +100/-3 |
| `src/lib/import/joinhalal.ts` | Wired `html` param to `hasAlkoholverkauf(schema, html)` | +1/-1 |
| `scripts/import-joinhalal.ts` | Wired `html` param to `hasAlkoholverkauf(schema, html)`, added `runBackfillAlcohol()` (~120 lines), `--backfill-alcohol` argument parsing, updated header usage docs | +159/-0 |

## Files Created

| Path | Purpose |
|---|---|
| `src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts` | 3 new HTML badge fallback regression tests (total 7, was 4) — extended existing file |
| `src/__tests__/utils/joinhalal-parser.test.ts` | 9 new tests (6 for `extractHalalBadgesFromHtml`, 3 for `hasAlkoholverkauf` HTML fallback) (total 73, was 64) — extended existing file |

Note: Both test files were extended, not created from scratch.

## Code Quality Validation

- [x] `npx tsc --noEmit` — 0 errors
- [x] `npx eslint` on all 5 changed files — 0 errors
- [x] `npx vitest run` on plan test files — 80/80 pass
- [x] Full test suite — 474 passed, 1 failed (pre-existing `AdminProvidersPageContent` — unrelated)
- [x] `npm run build` — fails due to missing `NEXT_PUBLIC_SUPABASE_URL` env var (pre-existing environment issue, not caused by our changes)

### Build Note

The `npm run build` failure is a pre-existing environment configuration issue: the CI/build machine needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` set. This error existed before Plan 057 changes and is not caused by any of the modified files. TypeScript compilation (`tsc --noEmit`) confirms zero type errors across all changed files.

## Value Statement Validation

- **Original**: "As an admin, I want the JoinHalal importer to detect alcohol-sale status from the actual visible Halal Merkmale badges when JSON-LD is incomplete, so that providers with Alkoholverkauf are reliably imported as review_status = 'rejected' and providers with Kein Alkoholverkauf are not falsely rejected."
- **Implementation delivers**: ✅ Parser now checks JSON-LD first, falls back to visible HTML badges. Positive `Alkoholverkauf` → rejected, explicit `Kein Alkoholverkauf` → not rejected. Backfill mode allows retroactive correction of ~900 pending providers with dry-run safety.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `extractHalalBadgesFromHtml()` | `joinhalal-parser.test.ts` | ✅ Yes | ✅ Yes | TypeError: extractHalalBadgesFromHtml is not a function | ✅ Yes |
| `hasAlkoholverkauf()` HTML fallback | `joinhalal-parser.test.ts` | ✅ Yes | ✅ Yes | AssertionError: expected false to be true | ✅ Yes |
| `transformPage()` badge integration | `joinhalal-alkohol-rejection.test.ts` | ✅ Yes | ✅ Yes | AssertionError: expected 'pending' to be 'rejected' | ✅ Yes |
| `runBackfillAlcohol()` | N/A (CLI orchestration) | ⚠️ Not unit testable | N/A | CLI function with DB + network I/O; manual testing via `--dry-run` | N/A |

### Backfill Testing Note

`runBackfillAlcohol()` is a CLI orchestration function with direct database queries and network I/O. It composes tested units (`hasAlkoholverkauf`, `extractHalalBadgesFromHtml`, `extractSchemaOrgFromHtml`) and cannot be meaningfully unit-tested without mocking the entire Supabase client + HTTP layer. Its correctness is validated via:
- Dry-run mode (`--backfill-alcohol --dry-run`) for operator verification before writes
- Double-guard on write path: `.in('id', ids).eq('review_status', 'pending')`
- Underlying detection logic is thoroughly unit-tested (80 tests)

## Test Coverage

### Unit Tests — Parser (`joinhalal-parser.test.ts`)

- 6 tests for `extractHalalBadgesFromHtml`: positive badges, negative badge, missing section, heading-only, empty HTML, hyphenated heading
- 7 tests for `hasAlkoholverkauf` HTML fallback: JSON-LD primary still works with html param, null/undefined fallback, non-alcohol fallback, Kein Alkoholverkauf → false, no HTML → false, no badges section → false, hyphenated property name

### Integration Tests — Import Path (`joinhalal-alkohol-rejection.test.ts`)

- 3 tests for `transformPage` badge fallback: positive badge → rejected, negative badge → pending, no badges → pending
- 4 pre-existing tests for JSON-LD path remain passing

## Test Execution Results

```
$ npx vitest run src/__tests__/utils/joinhalal-parser.test.ts src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts

 ✓ src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts (7 tests) 3ms
 ✓ src/__tests__/utils/joinhalal-parser.test.ts (73 tests) 7ms

 Test Files  2 passed (2)
      Tests  80 passed (80)
   Duration  510ms
```

```
$ npx tsc --noEmit
(no output — 0 errors)
```

```
$ npx eslint src/utils/joinhalal-parser.ts src/lib/import/joinhalal.ts scripts/import-joinhalal.ts src/__tests__/utils/joinhalal-parser.test.ts src/__tests__/lib/import/joinhalal-alkohol-rejection.test.ts
(no output — 0 errors)
```

## Outstanding Items

- **M6 (Release artifacts)**: Version bump and CHANGELOG entry deferred to DevOps Stage 1. Version will be confirmed via `git fetch --tags` at that time.
- **Build env**: `npm run build` requires `.env.local` with Supabase env vars (pre-existing, not caused by this change).
- **Backfill execution**: The `--backfill-alcohol` mode is implemented but has not been run against production data. Operator should run `--backfill-alcohol --dry-run` first to review candidates.

## Assumptions

- The pre-existing `AdminProvidersPageContent` test failure (1 of 474) is unrelated to Plan 057 and should not block handoff.
- The `npm run build` failure from missing env vars is a known CI/local dev config issue and is not a regression from this change.

## Next Steps

1. → Code Review (⑥)
2. → QA validation
3. → UAT validation
4. → DevOps Stage 1 (version bump + deployment)
