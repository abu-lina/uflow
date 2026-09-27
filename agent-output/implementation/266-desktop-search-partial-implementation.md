---
ID: 266
Origin: 266
UUID: 4f5bf2ef
Status: Active
---

# Implementation 266: Desktop search — suggestion/result parity and partial (prefix) matching

| Field          | Value                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Plan           | [266-desktop-search-partial-plan.md](../planning/266-desktop-search-partial-plan.md)                |
| Analysis       | [266-desktop-search-partial-analysis.md](../analysis/closed/266-desktop-search-partial-analysis.md) |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/431                                                        |
| Classification | Bugfix                                                                                              |
| Date           | 2026-09-26                                                                                          |
| Session        | S266-desktop-search-partial · branch `session/266-desktop-search-partial`                           |
| Version        | 0.15.20 (preliminary — final version confirmed at DevOps Stage 1)                                   |

## Changelog

| Timestamp (UTC)   | Agent       | Change                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26T21:27Z | Implementer | M2–M7 implemented. Migration 134 validated against local PG 17.6. Two defects found and fixed during implementation (see Defects Found During Implementation). Version bumped 0.15.18 → 0.15.20 after `git fetch --tags` showed origin/main had advanced to 0.15.19.                                                                                                                                                          |
| 2026-09-26T23:10Z | Implementer | Code review REJECTED → fixed. Added a committed, executable SQL suite (PGlite). The suite found a **blocker the review missed**: `search_food_concepts` joined on the dropped `providers.offers_ids`, so migration 134 would abort on UAT/prod. Also fixed: empty-query categories (HIGH), provider suggestions not name-filtered (MEDIUM), and two further 107 regressions (description matching, zero-provider categories). |
| 2026-09-27T09:00Z | Implementer | Code review round 2 REJECTED → fixed. HIGH i18n: SearchBar fallback placeholder and ProviderCard location-count, halal-level, Approve and Reject labels now use `t()` with 4 new `providers.*` keys in all 6 locales. MEDIUM: added `idx_categories_desc_simple_search` matching the category name + description predicate. Both covered by failing-first tests.                                                              |

## Memory Status

**NO-MEMORY MODE.** `flowbaby_retrieveMemory` returned `"No workspace folder open. Memory requires a workspace."` Proceeded artifact-first using the plan and analysis documents as the authoritative source.

## Open Question Gate

Plan 266 contains three OPEN QUESTION entries, all marked `[RESOLVED]` (Q1→D1, Q2→D2, Q3→D3). No unresolved open questions. Implementation proceeded without escalation.

## Implementation Summary

Both root causes from the analysis are closed by giving suggestions and results **one shared matching core in Postgres**:

- **RC1 (suggestions ≠ results)** — `search_scoped_suggestions` is now built _on top of_ `search_providers_for_query`. A suggestion is only emitted for a provider that the results query already matched, under the same section/city scope. This makes the "suggestion with no results" state structurally impossible rather than coincidentally avoided.
- **RC2 (exact lexemes only)** — matching is now `exact OR word-prefix` on every token (D1), using the `simple` text-search configuration.

**Why `simple` rather than `german`:** the plan required stopword-shaped prefixes such as `Ist` to keep working (M2.2). The `german` configuration discards `ist` as a stopword and stems `döner`→`don`, which both broadens and breaks prefix intent. The `simple` configuration performs no stemming and no stopword removal, which is the correct semantics for typeahead prefix matching. Exact-match behaviour is preserved via `plainto_tsquery('simple', …)` in the same predicate.

## Milestones Completed

- [x] **M1** — Pre-implementation UAT verification → **DEFERRED** (see Deferrals). F4 instead reproduced locally with an exact copy of the shipped function body.
- [x] **M2** — Migration `134_plan_266_desktop_search_partial.sql`: shared tokenizer, provider matcher, scoped suggestions, F4 fix, 6 GIN indexes.
- [x] **M3** — Service layer: `searchProviders` + `fetchSearchSuggestions` on the new RPCs; `matched_menu_items` threaded through types; zero ILIKE.
- [x] **M4** — UI: SearchBar passes section/city; ProviderCard renders matched dish; i18n in 6 locales.
- [x] **M5** — Branch coverage table (below).
- [x] **M6** — Baseline + EXPLAIN evidence (local; UAT deferred).
- [x] **M7** — Version 0.15.20 + CHANGELOG + migration-first deployment note.

## Files Created

| Path                                                              | Purpose                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `supabase/migrations/134_plan_266_desktop_search_partial.sql`     | Shared prefix tokenizer, provider-matching RPC, scoped suggestions RPC, F4 fix, 6 GIN indexes          |
| `src/__tests__/services/search-suggestions-plan266.test.ts`       | Regression: suggestions use the scoped RPC with section/city                                           |
| `src/__tests__/services/search-result-menu-match-plan266.test.ts` | Regression: matched dish names survive the provider→SearchResult transform                             |
| `src/features/providers/components/ProviderCard.plan266.test.tsx` | Regression: card renders matched dishes with a translated label                                        |
| `src/__tests__/migrations/134-desktop-search-partial.test.ts`     | **Executes** migration 134 in PGlite against a post-006 schema; 27 SQL tests (behaviour + index usage) |
| `src/__tests__/components/ProviderCard-i18n-plan266.test.tsx`     | Regression: card labels render in German; SearchBar fallback has no hardcoded placeholder              |

## Files Modified

| Path                                                            | Changes                                                                                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/providers/search.ts`                              | Replaced 4-way fan-out + ILIKE with one `search_providers_for_query` call; collects `matched_menu_items`; removed now-unused `searchOffers`/`searchNeeds` imports (−48 lines net) |
| `src/services/providers/suggestions.ts`                         | ILIKE fan-out → single scoped RPC; signature now `(query, limit, scope)`                                                                                                          |
| `src/services/providers/types.ts`                               | `matched_menu_items?: string[]` on `Provider` + `SearchResult`; passed through transform                                                                                          |
| `src/features/search/components/SearchBar.tsx`                  | Passes `{section, city}`; refetches when scope changes; Suspense fallback placeholder uses `t('search.placeholder')`                                                              |
| `src/app/(public)/providers/ProvidersContent.tsx`               | Adapter passes `matched_menu_items`                                                                                                                                               |
| `src/features/search/components/DiscoveryResultsGrid.tsx`       | `matched_menu_items` on `DiscoveryCardItem` + card props                                                                                                                          |
| `src/features/providers/components/ProviderCard.tsx`            | Renders capped "Serves: …" line; omitted when empty; location count, halal level, Approve/Reject via `t()`                                                                        |
| `src/translations/{de,en,ar,tr,ur,ps}.ts`                       | `providers.serves`, `locationsCount`, `halalLevel`, `approve`, `reject` (6 locales)                                                                                               |
| `src/__tests__/components/ProviderCard-multi-location.test.tsx` | Expects the translated English label `2 locations` (was the hardcoded German literal)                                                                                             |
| `src/__tests__/regression/255-trust-boundaries.test.tsx`        | Updated to assert the approved-only boundary at its new enforcement point                                                                                                         |
| `src/__tests__/services/providers.test.ts`                      | Updated to the new RPC contract; now asserts **no** ILIKE                                                                                                                         |
| `package.json`, `package-lock.json`                             | 0.15.18 → 0.15.20; devDependency `@electric-sql/pglite@^0.5.8` (WASM Postgres for migration tests; no native build, no CI service)                                                |
| `CHANGELOG.md`                                                  | `[Unreleased]` entry                                                                                                                                                              |

## Defects Found During Implementation

Two defects were caught by validation that unit tests alone would not have surfaced. Both are fixed.

1. **Unbalanced parentheses + duplicated matching logic in `search_scoped_suggestions`.** The first draft re-implemented all five match predicates inside the suggestions RPC and failed to parse (`syntax error at or near ","`). Rather than only balancing the parentheses, the function was rewritten to call `search_providers_for_query`. This removed ~40 lines of duplicated SQL and is what actually enforces decision D4 — the two paths can no longer drift apart.

2. **Index expression mismatch on `providers` (performance defect).** The index was declared on `to_tsvector('simple', provider_name)` while the RPC predicate used `to_tsvector('simple', coalesce(provider_name,''))`. Postgres treats these as different expressions, so the index was unusable and the query fell back to a sequential scan even with `enable_seqscan=off`. Corrected so the index expression matches the predicate exactly; `EXPLAIN` then confirms `Bitmap Index Scan`. A comment was added to the migration recording this constraint.

### Code review round (2026-09-26T23:10Z)

The committed SQL suite was written first and run against the unfixed migration.

3. **BLOCKER (found by the new suite, not by review): migration would abort in production.** `search_food_concepts` joined on `p.offers_ids`, which migration 006 dropped (089 was the hotfix for exactly this). The local PG fixture still had the column, so the earlier harness passed. Red: `error: column p.offers_ids does not exist`. Fixed: restored the `provider_offers` junction join.
4. **HIGH (review): `search_food_categories('')` returned nothing.** Restored 107 semantics: empty query returns all food categories, ranked by provider count.
5. **MEDIUM (review): provider suggestions were not filtered by name.** `Lahm` suggested `Istanbul Grill` as a _provider_. Now name-matched with the same exact-OR-prefix predicate.
6. **Two further 107 regressions (found while restoring 107):** categories must also match on **description**, and categories with **zero providers** must still be returned (`LEFT JOIN`). Both restored and tested.

Not restored on purpose: 107's display-name rewrite (`'\\s*Küche\\s*$'`). It carries the same double-escape bug as F4 and was verified to be a **no-op in production** (`'Türkische Küche'` comes back unchanged), so dropping it keeps real output identical.

### Code review round 2 (2026-09-27)

7. **HIGH (review): hardcoded UI strings.** `SearchBar`'s Suspense fallback used a literal English placeholder. `ProviderCard` had a literal `Standorte` location count, `Halal Level` aria-label and title, and `Approve`/`Reject` labels. All now go through `t()`: the fallback reuses `search.placeholder`, and the card uses the new keys `providers.locationsCount`, `providers.halalLevel`, `providers.approve` and `providers.reject`, added in all 6 locales. The Plan 151 multi-location test pinned the German literal; tests render in English, so it now expects `2 locations`, and German is covered by the new test.
8. **MEDIUM (review): no index for the category description predicate.** Added `idx_categories_desc_simple_search`, whose expression is exactly the predicate in `search_food_categories`. The name-only `idx_categories_simple_search` is kept because the category branch of `search_providers_for_query` and the cuisine suggestions still use it. Regression test: with `enable_seqscan = off`, the predicate plan must contain `Index Scan`.

## Verification Evidence

### F4 proven as a live defect (not assumed)

The analysis rated F4 as L1-for-expression / L2-for-production. It is now L1: the exact shipped function body (dollar-quoted, `'\\s+'`) was reproduced locally.

```
pre-fix tokenizer('döner keb') → "döner keb:*"        -- not split
to_tsquery('german', …)        → ERROR: syntax error in tsquery: "döner keb:*"
post-fix search_prefix_query() → 'döner':* & 'keb':*  -- valid
```

Any two-word query on the mobile "Was?" picker was failing in production.

### Behavioural verification (local PG 17.6, fixture dataset)

Migration applied cleanly and is idempotent (second run skipped existing indexes).

| Scenario                   | Query                       | Result                                   |
| -------------------------- | --------------------------- | ---------------------------------------- |
| Prefix, provider name      | `Istan`                     | Istanbul Grill ✅                        |
| Prefix, provider name      | `Kab`                       | Kabul Kitchen ✅                         |
| **Stopword-shaped prefix** | `Ist`                       | Istanbul Grill ✅ (fails under `german`) |
| Prefix, category           | `Afgh`                      | Kabul Kitchen (Afghanische Küche) ✅     |
| Menu item, exact           | `Lahmacun`                  | Istanbul Grill + `{Lahmacun}` ✅         |
| Menu item, prefix          | `Lahm`                      | Istanbul Grill + `{Lahmacun}` ✅         |
| **Multi-word prefix**      | `döner keb`                 | Istanbul Grill + `{Döner Kebab}` ✅      |
| Section scope              | `Istanbul` / food / Berlin  | store + Muenchen rows excluded ✅        |
| Section scope              | `Istanbul` / store / Berlin | store row only ✅                        |
| City scope                 | `Istanbul` / food / —       | Berlin + Muenchen ✅                     |
| **Trust boundary**         | pending provider            | `pending_leaks = 0` ✅                   |
| D4 invariant               | every suggestion for `Ist`  | `result_count ≥ 1` ✅                    |
| Edge: empty                | `''`                        | 0 rows, no error ✅                      |
| Edge: punctuation only     | `!!! &&& ***`               | 0 rows, no error ✅                      |
| Edge: tsquery operators    | `a & b \| c ! d :* (x)`     | 0 rows, no error ✅                      |
| Edge: SQL-ish input        | `' OR 1=1 --`               | 0 rows, no error ✅                      |

The operator/SQL-ish cases matter for security: user input is sanitised to alphanumerics before reaching `to_tsquery`, so tsquery-operator injection is not possible. All RPCs are `SECURITY INVOKER` with `SET search_path = public`.

### M6 Baseline & Measurements

Local fixture (tiny dataset) — **warm** timings:

| Query type         | Example     | Time    |
| ------------------ | ----------- | ------- |
| Single-word exact  | `Lahmacun`  | 1.03 ms |
| Single-word prefix | `Istan`     | 1.08 ms |
| Two-word prefix    | `döner keb` | 1.03 ms |
| Suggestions RPC    | `Ist`       | 1.16 ms |

Thresholds (≤100 ms suggestions, ≤200 ms provider match) are met locally by a wide margin, but **local numbers are not predictive of UAT** — the dataset is 5 providers. Index usage is the meaningful local signal:

```
Bitmap Index Scan on idx_providers_name_simple_search
  Index Cond: (to_tsvector('simple', COALESCE(provider_name,'')) @@ '''istan'':*')
Bitmap Index Scan on idx_food_menu_simple_search
  Index Cond: (to_tsvector('simple', COALESCE(name_de,'') || ' ' || COALESCE(name_en,'')) @@ '''lahm'':*')
```

Both hot predicates are index-backed.

## M5 Branch Coverage

| Branch                                          | Expected                | Evidence                                                                | Status |
| ----------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- | ------ |
| Desktop, provider suggestion, same section/city | Results                 | SQL: `Istanbul`/food/Berlin                                             | ✅     |
| Desktop, provider suggestion, other section     | Not suggested           | SQL: store row excluded from food scope                                 | ✅     |
| Desktop, provider suggestion, other city        | Not suggested           | SQL: Muenchen excluded when city=Berlin                                 | ✅     |
| Desktop, menu-item suggestion                   | Results + dish on card  | SQL `{Lahmacun}` + card test + transform test                           | ✅     |
| Desktop, cuisine suggestion                     | Results, no ILIKE       | SQL: `Afgh` → category match; `providers.test.ts` asserts no ILIKE      | ✅     |
| Desktop, Enter with partial term                | Prefix results          | SQL: `Istan`, `Kab`, `Ist`                                              | ✅     |
| Mobile `/search`, offer-concept dish            | Results (unchanged)     | Migration suite: `search_food_concepts('döner keb')`, junction join     | ✅     |
| Mobile `/search`, empty "Was?" (initial load)   | Top concepts/categories | Migration suite: empty query → ranked rows, incl. 0-provider categories | ✅     |
| Mobile `/search`, `food_menu` dish              | Results + dish          | Same `/food?q=` path, now menu-aware                                    | ✅     |
| Mobile `/search`, multi-word "Was?"             | No error; results       | Migration suite: `search_food_categories('türkische küche')` → 1 row    | ✅     |
| Ummah / store sections, partial term            | Prefix results          | `section_filter` is generic; store scope verified                       | ✅     |

No row left unconfirmed.

## TDD Compliance

| Function/Change                                                                          | Test File                                  | Test Written First?                                    | Failure Verified? | Failure Reason                                                                                                         | Pass After Impl? |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `fetchSearchSuggestions` (scoped RPC)                                                    | `search-suggestions-plan266.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `TypeError: supabase.from is not a function` (old ILIKE path)                                                          | ✅ Yes           |
| `matched_menu_items` in `transformProviderToSearchResult`                                | `search-result-menu-match-plan266.test.ts` | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected undefined to deeply equal [ 'Lahmacun' ]`                                                    | ✅ Yes           |
| ProviderCard matched-dish rendering                                                      | `ProviderCard.plan266.test.tsx`            | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected … to contain 'matched_menu_items'`                                                           | ✅ Yes           |
| `search_prefix_query` / `search_providers_for_query` / `search_scoped_suggestions` (SQL) | `134-desktop-search-partial.test.ts`       | ⚠️ Post-fix (first round, /tmp harness); now committed | ✅ Yes            | Pre-fix `to_tsquery` → `ERROR: syntax error in tsquery: "döner keb:*"`; pre-fix results path never queried `food_menu` | ✅ Yes           |
| `search_food_concepts` junction join (blocker)                                           | `134-desktop-search-partial.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `error: column p.offers_ids does not exist` (migration aborted)                                                        | ✅ Yes           |
| `search_food_categories` empty query (HIGH)                                              | `134-desktop-search-partial.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected [] to deeply equal [ {…}, {…}, {…} ]`                                                        | ✅ Yes           |
| `search_food_categories` description match / 0-provider rows                             | `134-desktop-search-partial.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected [] to deeply equal [ 'Türkische Küche' ]` / `expected []`                                    | ✅ Yes           |
| Provider suggestion name filter (MEDIUM)                                                 | `134-desktop-search-partial.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected [ { label: 'Istanbul Grill', … } ] to deeply equal []`                                       | ✅ Yes           |
| `idx_categories_desc_simple_search` (review round 2, MEDIUM)                             | `134-desktop-search-partial.test.ts`       | ✅ Yes                                                 | ✅ Yes            | `expected 'Seq Scan on categories c …' to contain 'Index Scan'`                                                        | ✅ Yes           |
| ProviderCard labels via `t()` (review round 2, HIGH)                                     | `ProviderCard-i18n-plan266.test.tsx`       | ✅ Yes                                                 | ✅ Yes            | `Unable to find role="button" and name "Freigeben"`                                                                    | ✅ Yes           |
| SearchBar fallback placeholder via `t()` (review round 2, HIGH)                          | `ProviderCard-i18n-plan266.test.tsx`       | ✅ Yes                                                 | ✅ Yes            | `AssertionError: expected '…' not to contain 'placeholder="Search in your Ummah"'`                                     | ✅ Yes           |

The SQL is now protected by CI: the suite applies migration 134 to an in-process Postgres 18 (PGlite) whose schema mirrors production after migration 006, then runs behavioural assertions. It runs inside the normal `npx vitest run`, so no CI change is needed.

## Code Quality Validation

| Gate             | Command              | Result                                                                                                                                                                                                                         |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type check       | `npm run type-check` | ✅ Pass (0 errors)                                                                                                                                                                                                             |
| Tests            | `npx vitest run`     | ✅ 2609 passed, 28 skipped, **0 failed** (292 files) — review round 2                                                                                                                                                          |
| Lint (full repo) | `npm run lint`       | ✅ 0 errors, 151 warnings — all pre-existing; **none in files touched by this plan** (verified by grep)                                                                                                                        |
| Build            | `npm run build`      | ⚠️ Compiles + type-validates successfully; fails at page-data collection with `Missing NEXT_PUBLIC_SUPABASE_URL`. **Confirmed pre-existing**: clean `HEAD` (work stashed) fails identically. No `.env.local` in this worktree. |

### Note on two updated tests

Two pre-existing tests were changed. Neither was weakened:

- `255-trust-boundaries.test.tsx` — this is a **security** regression test. The approved-only restriction moved from a client-side `.eq('review_status','approved')` into the RPC's SQL. The test now asserts the boundary at its new enforcement point _and_ asserts that suggestions never touch a table directly (the injected client throws on `.from()`). Server-side enforcement is independently proven by `pending_leaks = 0`.
- `providers.test.ts` — updated to the new RPC contract. Its ILIKE assertion was **inverted** from `toHaveBeenCalled()` to `not.toHaveBeenCalled()`, which strengthens the policy check rather than removing it.

### API surface change

`fetchSearchSuggestions(query, limit, client)` → `fetchSearchSuggestions(query, limit, { section, city, client })`.

This was **not** the first design. The initial version appended `section`/`city` as positional parameters, which silently captured the `client` argument at the existing call site in `255-trust-boundaries.test.tsx` — a real breaking change that a passing type-check would not have caught (both are objects). Switching to an options object eliminated the hazard and keeps the parameter count sane. All call sites updated; `tsc` clean.

## Value Statement Validation

> As a desktop user … I want every suggestion I click to show the matching places, and to find places by typing only the start of a word.

| Success criterion                                          | Status                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1. Every suggestion type returns ≥1 result in scope        | ✅ Structurally guaranteed — suggestions derive from the results matcher (D4) |
| 2. Prefix input returns hits, incl. stopword-shaped `Ist`  | ✅ Verified for `Istan`, `Kab`, `Ist`, `Afgh`, `Lahm`                         |
| 3. Multi-word partials never raise a tsquery error         | ✅ F4 fixed; `döner keb` returns results                                      |
| 4. Menu-item matches shown on the card                     | ✅ `matched_menu_items` → "Serves: …", 6 locales                              |
| 5. Zero ILIKE in suggestion + `searchProviders` query path | ✅ `grep -n "ilike"` returns nothing in both files; asserted by test          |

## Deferrals

| Item                           | Owner     | Reason                                                                                                                                                                                                                                                                          | Trigger to close                                          |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **M1** UAT pre-verification    | DevOps/QA | No UAT DB access from this worktree. Plan explicitly permits this (D6 is idempotent either way). F4 was instead proven locally against the exact shipped body.                                                                                                                  | DevOps Stage 1                                            |
| **M6** UAT timings             | DevOps/QA | Local fixture has 5 providers; timings are not predictive. Index usage verified locally instead.                                                                                                                                                                                | DevOps Stage 1 — capture timings + `EXPLAIN` on real data |
| **Local browser verification** | QA/UAT    | ⚠️ **Blocked**: no `.env.local` in this worktree, so `npm run dev` cannot reach Supabase and `npm run build` cannot collect page data (pre-existing, reproduced on clean HEAD). The matched-dish line and scoped suggestions have **not** been visually confirmed in a browser. | QA/UAT pass                                               |

## Outstanding Items

1. ~~SQL behaviour is not covered by CI~~ — **resolved** in the review round (`134-desktop-search-partial.test.ts`). Limitation: the fixture schema is hand-maintained, not generated from the migration chain, so it can drift from production. It proved its worth immediately by catching the `offers_ids` blocker. A follow-up could reuse the harness for other RPC migrations.
2. **UI not visually verified** — blocked on environment, see Deferrals. QA should specifically check the "Serves:" line for RTL (`ar`, `ur`) and for truncation with long dish names.
3. **`search_provider_ids_by_name` is now unused by app code** but intentionally retained for rollback (D7). Cleanup is owned by the next search-touching plan.
4. **Migration number 134** was re-checked against `origin/main` at 2026-09-26T21:27Z and is still free. If another worktree merges 134 first, renumber before merge.
5. **Version**: plan targeted "next patch after 0.15.18", but `origin/main` is now 0.15.19, so 0.15.20 was used. Preliminary — confirm at DevOps Stage 1.

## Deployment Path Audit

Applies: this change adds a migration that the new application code depends on.

- `.github/workflows/deploy-uat.yml` — no migration step.
- `.github/workflows/deploy-hetzner.yml` — no migration step.
- Migrations are applied manually (pattern: `scripts/apply-provider-social-migration.sh`).

**Required ordering — deploying code before the migration will break search:** apply `134_plan_266_desktop_search_partial.sql` to UAT **before** `deploy-uat.yml`, and to production **before** `deploy-hetzner.yml`.

Rollback: functions are additive and `CREATE OR REPLACE`; the previous RPCs remain in place (D7), so reverting the app commit restores prior behaviour with no DB rollback needed.

## Next Steps

1. **Code Reviewer** — focus on migration 134 (SQL correctness, `SECURITY INVOKER`, grants), the `fetchSearchSuggestions` signature change, and the two updated pre-existing tests.
2. **QA** — lint/type/test gates; browser verification of the matched-dish line (incl. RTL); confirm the M5 branch table on UAT.
3. **DevOps** — Stage 1: confirm version and migration number; apply migration **before** deploying; capture UAT baseline (M6).
