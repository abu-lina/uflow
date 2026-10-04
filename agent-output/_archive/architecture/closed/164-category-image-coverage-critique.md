---
ID: 164
Origin: 164
UUID: a3f7c2b1
Status: Resolved
---

# Architectural Critique: Plan 164 — Expand Category Image Enrichment Coverage

**Date**: 2026-06-12
**Reviewer**: Architect
**Documents reviewed**:
- Analysis: `agent-output/analysis/164-category-image-coverage-analysis.md`
- Plan: `agent-output/planning/164-category-image-coverage-plan.md`
- Source: `src/lib/enrichment/image-enrichment.ts`
- Script: `scripts/enrich-images.ts`
- Test: `src/__tests__/lib/enrichment/image-enrichment.test.ts`

---

## Verdict: NEEDS REVISION

The plan correctly diagnoses all 11 stale UUIDs and identifies 38 uncovered categories. However, it contains a math error in the new-entry count (36 stated, 38 listed in tables) that cascades into wrong pool size (53 vs 55) and omits 2 meal type categories from the batch curation plan. These are blocking. Everything else is solid.

---

## Blocking Concerns

### B1: Math Error — 38 New Entries, Not 36

The plan's M2 header says "Add New Category Entries (36 entries)" but its own tables list **38 entries**:

| Group | Plan says | Actual rows in tables |
|-------|----------|----------------------|
| Cuisines | 9 | 9 |
| Dish Types | 11 | 11 |
| Dietary | 2 | 2 |
| Meal Types | 4 | 4 |
| Store Types | 7 | 7 |
| Others | 5 | 5 |
| **Total** | **36** | **38** |

**Cascading impact**:

| Affected item | Wrong value | Correct value |
|--------------|-------------|---------------|
| Pool size | 53 entries | **55 entries** (20 - 3 + 38) |
| Test assertion (M4, line 13) | `toHaveLength(53)` | `toHaveLength(55)` |
| TDD Phase 1 test count | "2 passes, 3 fails" | Same 3 fails, but length test fails for a different number |

The TDD Phase 3 build-time invariant suggestion (line 368) would also get the wrong number.

### B2: Missing 2 Meal Type Categories from Batch Plan

The curation batch plan covers 44 categories but misses these 2 meal types:

| name_de | name_en | UUID | Current status |
|---------|---------|------|----------------|
| Salate | Salads | `e2c82e56-ae9c-40fc-ab7a-d002f446133f` | Not in any batch |
| Kuchen / Cafe | Cake / Cafe | `678e44ce-521f-4397-bb0b-018176622a59` | Not in any batch |

**Fix options**:
- **Option A (preferred)**: Add both to Batch 3. Would make it 14 categories × 3 queries = **42 calls**, still within the 45-call script safety limit. Update the batch 3 command to include `e2c82e56` and `678e44ce`.
- **Option B**: Create a Batch 5 with these 2 categories (6 queries).

**Recommendation**: Option A. Batch 3 currently has exactly 12 categories. 14 is still well within the 45-call limit and avoids an extra hour of waiting.

---

## Non-Blocking Suggestions

### S1: UUID Brittleness Is Undocumented Design Debt

The plan fixes 11 stale UUIDs but doesn't address *why* they went stale. The DB was reseeded, UUIDs changed, and the pool silently broke. The analysis (recommendation #4) suggests a name-based lookup (`category_type + name_en`) that would survive reseeds. The plan persists with UUIDs as keys.

**Impact**: If the DB is reseeded again, all 55 entries could go stale. The same 11-category silent-failure pattern repeats.

**Recommendation**: Don't block on this — the UUID fix is pragmatic. But add a design debt entry to `system-architecture.md` for future resolution. Document the constraint that all future migration category inserts should use fixed UUIDs (like American and Groceries already do) rather than `gen_random_uuid()`.

### S2: No Dry-Run Step Before Each --write Batch

The M6 verification includes one dry-run, but it's post-code-changes and only tests 4 categories. The plan should recommend a dry-run before each write batch:

```bash
# Before batch 1 write:
npx tsx scripts/enrich-images.ts --curate --categories 9a7971c1,...,a798fc0d
# Verify UUIDs resolve correctly, then re-run with --write
```

The script defaults to dry-run (`isDryRun: !isWrite`), so this is low-effort and catches invalid UUIDs before they waste Unsplash quota. The current M6 dry-run only verifies 4 of 53 UUIDs post-code-changes.

### S3: Missing Regression Test for Stale UUID Removal

The plan adds a "no duplicate UUID keys" test but doesn't verify that the 3 stale overlapping UUIDs (Italian `b35965ed`, Indian/Pakistani `f0118e0e`, Thai `f577c7ce`) were actually **removed** from the pool. If an implementer accidentally leaves one in, the duplicate-keys test won't catch it (it's not a duplicate — it's a separate stale key).

**Recommendation**: Add a test:

```typescript
it('does not contain removed stale UUIDs', () => {
  expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('b35965ed-fdb0-4bc5-a872-ab3bbc5139de');
  expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae');
  expect(CATEGORY_IMAGE_POOL).not.toHaveProperty('f577c7ce-d2e2-46ba-b494-57b038aa4b48');
});
```

### S4: No DB Integration Test

The analysis Gap #5 suggests a DB-integration test. The plan instead updates the Turkish UUID to Afghan (a valid in-pool UUID) for the unit test. This verifies pool contents but doesn't verify the UUIDs actually exist in the database.

**Recommendation**: Optional stretch goal. The production UUID verification query (M6 rollout section) is the practical safeguard. A DB integration test would be nice-to-have but isn't blocking given the explicit production verification step.

### S5: Query Quality — No Verification Loop

The plan proposes 114 Unsplash queries (38 × 3). Some queries are very generic:

- `technology shop modern` (Electronics)
- `gadget store interior` (Electronics)
- `gift shop display` (Gifts/Decor)

There's no mechanism to verify query quality — the plan delegates this to "QA spot-check" (risk #6). If queries return irrelevant images, the entire curated stock pool is weak for that category, requiring a re-run.

**Recommendation**: After each dry-run, spot-check the returned Unsplash photo titles/descriptions (logged by the script). Adjust poor queries before the --write run. Add a note in the batch instructions that the Implementer should review returned photo metadata and flag any categories where <3 relevant images were found.

### S6: Orphaned Enrichment Candidates

If `enrichment_candidates` contains pending entries for providers in the 11 stale categories, those candidates were created with DEFAULT images (since the stale UUIDs fell through to DEFAULT). After the fix, new candidates will use proper category images. Existing pending candidates remain with DEFAULT images.

**Impact**: Minor — pending candidates get approved/applied, not re-created. Only matters if existing pending candidates are approved after the fix.

**Recommendation**: No code change needed. Document that pre-existing candidates for stale categories will retain DEFAULT images. New enrichment runs will use the correct category images.

### S7: Pool Ordering

The plan mentions (TDD Phase 3) "consider sorting pool entries alphabetically by UUID for readability." A 55-entry object literal becomes hard to scan. 

**Recommendation**: Implement this during M2. Sort entries by UUID within the object literal. Low effort, improves maintainability for future additions.

---

## Items the Implementer Should Watch For

1. **Correct count**: The pool will have **55 entries**, not 53. Update all plan numbers accordingly.

2. **Batch 3 must include Salads and Cake/Cafe**: Add `e2c82e56-ae9c-40fc-ab7a-d002f446133f` and `678e44ce-521f-4397-bb0b-018176622a59` to the batch 3 command. 14 categories × 3 queries = 42 calls, within limit.

3. **Order of operations in M2**: When adding the 36→38 new entries, ensure the 3 stale overlapping UUIDs (Italian `b35965ed`, Indian/Pakistani `f0118e0e`, Thai `f577c7ce`) are removed as part of the same edit. Leaving a stale entry and a new entry for the same concept would create an unreachable dead key (no DB UUID matches it, but it wastes pool space and confuses readers).

4. **Kebab/Döner TODO placement**: Place it near the top of the pool, not buried at the bottom. Future developers need to see it before they try to add a Kebab entry.

5. **Test ordering in TDD Phase 1**: The plan says to update `toHaveLength(20)` to `toHaveLength(53)` → should be `toHaveLength(55)`. Run this as the very first change — it will fail RED, proving the test catches the missing entries.

6. **Turkish UUID in the existing test**: The plan updates line 18 from `232c2870` (stale) to `8204a370` (Afghan). Make sure the assertion also changes from `'turkish kebab doner'` to `'afghan food kabuli'` to match the Afghan queries.

7. **Vegetarian/Vegan `category_type` NULL**: The analysis flags this (Gap #4). While it doesn't block enrichment, the Implementer should verify these two rows exist in the DB at all before adding pool entries for them. If migration 100 wasn't applied to DEV, the UUIDs won't exist.

---

## Pattern Compliance Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| Follows CATEGORY_IMAGE_POOL pattern | PASS | Object literal with UUID keys → string[3] values |
| UUID-as-key sustainability | DESIGN_DEBT | Survives until next DB reseed; should move toward name-based lookup or fixed-UUID migrations |
| Single object literal for 55 entries | PASS | ~3KB, no performance concern |
| No premature service addition | PASS | Stays within Postgres + Unsplash constraints |
| Follows existing resolve flow | PASS | No changes to `resolveCategoryImageQueries()` logic |
| Batch sizing within constraints | PASS (after fix) | All batches ≤ 42 calls, within 45 limit |
| Test follows existing patterns | PASS | Vitest + describe/it blocks, no new framework |

---

## Summary

The plan correctly identifies the problem and proposes a sound fix. The two blocking issues (wrong entry count, missing batch categories) are arithmetic errors in the plan text, not design flaws. Fix the count from 36→38, pool size from 53→55, and add Salads/Cake/Cafe to Batch 3. After revision, APPROVED.

| # | Concern | Severity | Resolution |
|---|---------|----------|------------|
| B1 | 36→38 entry count error | BLOCKING | Fix all numbers: pool=55, test=55, TDD=55 |
| B2 | Missing Salads & Cake/Cafe from batches | BLOCKING | Add to Batch 3 (14 cats, 42 calls) |
| S1 | UUID brittleness undocumented | LOW | Add design debt entry |
| S2 | No per-batch dry-run step | LOW | Add guidance in M5 |
| S3 | No stale-UUID removal regression test | LOW | Add `not.toHaveProperty` assertions |
| S4 | No DB integration test | LOW | Optional; production verification suffices |
| S5 | No query quality verification | LOW | Add metadata review step |
| S6 | Orphaned enrichment candidates | LOW | Document in rollout notes |
| S7 | Pool not sorted | LOW | Sort entries during M2 |
---
| 2026-06-12 | Orchestrator | Blocking issues B1+B2 fixed in plan revision. Critique resolved. |
