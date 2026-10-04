---
ID: 266
Origin: 266
UUID: 4f5bf2ef
Status: Planned
---

# 266 — Desktop search: suggestion click yields no results + no partial matches

Session: S266-desktop-search-partial · Branch: `session/266-desktop-search-partial` · Pipeline: Bugfix

## Changelog

| Date              | Agent   | Change                                                                                                                                                                    |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26        | Analyst | Initial RCA. NO-MEMORY MODE (artifact-first). Two root causes proven (L1) via SQL POC on local PG 17 + vitest code-path POC.                                              |
| 2026-09-26T21:03Z | Planner | Status → Planned. Incorporated into `agent-output/planning/266-desktop-search-partial-plan.md` (Q1→D1 word-prefix, Q2→D2 scoped suggestions, Q3→D3 matched dish on card). |

## Value Statement and Business Objective

Search is the primary discovery path on desktop. A suggestion that leads to an empty list tells users "we have nothing", even when matching providers exist. Fixing this protects discovery conversion and trust. It stays inside the Postgres-first rule: tsvector, no ILIKE.

## Objective

1. Explain why picking a desktop suggestion shows no listed results.
2. Explain why partial terms (prefixes, part-words) return no hits.

Constraint: stay within Postgres tsvector. No ILIKE.

## Context

- Desktop search = `SearchBar` in `Header` (desktop row), [src/features/search/components/SearchBar.tsx](src/features/search/components/SearchBar.tsx).
- Suggestions: `fetchSearchSuggestions`, [src/services/providers/suggestions.ts](src/services/providers/suggestions.ts).
- Results: `/food[/city]?q=` → `renderProvidersPage` (SSR) and `/api/providers/search` (client pages). Both call `searchProvidersAndCommunityServices` → `searchProviders`, [src/services/providers/search.ts](src/services/providers/search.ts#L316-L372).
- Mobile `/search` page (Plans 096/097) uses separate prefix-enabled RPCs (`search_food_concepts`, `search_food_categories`, `search_food_menu_items`) for its _picker_. After selection it lands on the same `/food?q=` results path.

### Prior art

- **229-desktop-search-chips-unify** (`cr/229-…`, unmerged): changes chips, filters, near-me and the city dropdown. It does **not** touch `suggestions.ts`, `search.ts`, or the suggestion click handler. Its only related change is threading `filters` through `onSearchSubmit`. It does not overlap this bug. (Checked via `git diff HEAD...cr/229-desktop-search-chips-unify`.)
- **96-meal-search-was** (Plans 096/097, shipped v0.10.24): added `search_food_concepts` with the `token:*` prefix pattern, and 077 extended prefix matching to the food RPCs. That prefix work was **only** applied to the mobile picker RPCs. It never reached the desktop results path (`search_provider_ids_by_name`, `search_offers`, `search_needs`).

## Methodology

- Upstream tracing: suggestion `onMouseDown` → `Header.handleSearchSubmit` → `buildResultsUrl` → `renderProvidersPage` / API route → `searchProviders` → RPCs in `001_baseline.sql`.
- **POC-A (vitest, temporary file, removed after the run):** used a recording Supabase client to capture which tables and RPCs each path touches, and rendered `SearchBar` to capture the suggestion-click submit arguments.
- **POC-B (SQL, throwaway PG 17.6 at `/tmp`, German Snowball config):** copied the suggestion predicates and the results predicate exactly and ran them on a small fixture: food/store providers, 2 cities, `food_menu` items, offers, categories.
- Branch enumeration over suggestion type × section × city × submit mode (State-Machine heuristic).

## Findings

### F1 — Suggestions and results use different corpora and different match semantics (ROOT CAUSE for issue 1) — **L1 Proven**

|                                | Suggestions (`fetchSearchSuggestions`) | Results (`searchProviders`)                                                               |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Provider name                  | `providers.provider_name ILIKE '%q%'`  | `search_provider_ids_by_name` → `to_tsvector('german', provider_name) @@ plainto_tsquery` |
| Menu items                     | `food_menu.name_de ILIKE '%q%'`        | **not queried at all**                                                                    |
| Categories                     | `categories.name_de ILIKE '%q%'`       | `categories.name_de ILIKE '%q%'`                                                          |
| Offers / needs                 | not queried                            | `search_offers` / `search_needs` (plainto only)                                           |
| Section scope (`listing_type`) | **none**                               | `eq('listing_type', section)`                                                             |
| City scope                     | **none**                               | `eq('address_city', city)`                                                                |

POC-A output (proves the table above against the real code):

```
P1 tables [ 'providers', 'food_menu', 'categories' ]  ilike [provider_name %Lah%, name_de %Lah%, name_de %Lah%]  scopeEqs 0
P2 touched [ 'from:providers', 'rpc:search_provider_ids_by_name', 'from:categories' ]   // query "Lahmacun", section food
P3 onSearchSubmit args [["Lahmacun",""]]   url /food?q=Lahmacun
```

The client-side flow is correct (P3). Clicking a suggestion submits exactly its label and the current location, and the URL carries `q=<label>`. **The bug is not in React state or URL handling.** It is on the server: the results query cannot find what the suggestion query found.

POC-B: what the list shows after clicking each suggestion:

| Suggestion clicked            | Type     | `/food` (Everywhere)        | `/food/berlin`           |
| ----------------------------- | -------- | --------------------------- | ------------------------ |
| Kabul Kitchen (Hamburg, food) | provider | ✅ Kabul Kitchen            | ❌ empty (city mismatch) |
| Halal Markt Yildiz (store)    | provider | ❌ empty (section mismatch) | ❌ empty                 |
| Lahmacun                      | menuItem | ❌ empty                    | ❌ empty                 |
| Adana Kebab                   | menuItem | ❌ empty                    | ❌ empty                 |
| Kabuli Pulao                  | menuItem | ❌ empty                    | ❌ empty                 |
| Türkisch                      | cuisine  | ✅ 2                        | ✅ 1                     |

Mechanisms, in order of likely user impact:

- **F1a — menuItem suggestions (L1):** these always return an empty list. The only exception is a coincidental match on a provider name, offer, or category. `food_menu` has a GIN-indexed `search_vector` (baseline `idx_provider_menu_items_search_vector`, table renamed to `food_menu` in 086), but `searchProviders` never uses it.
- **F1b — provider suggestions from another section (L1):** suggestions ignore `listing_type`, so store and ummah providers are suggested on `/food` and return nothing.
- **F1c — provider suggestions from another city (L1):** suggestions ignore the active city, so providers from other cities are suggested on `/food/<city>` and return nothing.

### F2 — The results path has no prefix/partial matching (ROOT CAUSE for issue 2) — **L1 Proven**

`search_provider_ids_by_name`, `search_offers` and `search_needs` (the current definitions in `001_baseline.sql`) use only `plainto_tsquery`, which matches whole lexemes. POC-B, submitting typed text with Enter:

| Typed      | Result | Note                                                                   |
| ---------- | ------ | ---------------------------------------------------------------------- |
| `Istan`    | ❌     | not a lexeme of "Istanbul Grill"                                       |
| `Istanbul` | ✅     |                                                                        |
| `Kab`      | ❌     |                                                                        |
| `Kabul`    | ✅     |                                                                        |
| `Dön`      | ✅     | coincidence: Snowball stems "Dön" and "Döner" to the same lexeme `don` |
| `Tür`      | ✅     | only because the categories branch uses **ILIKE**                      |

The suggestion dropdown uses ILIKE substring matching, so it looks like partial matching works. Pressing Enter or clicking the search icon with the same partial text then goes through exact-lexeme matching and returns nothing. That contrast is the user-visible "suggestions yes, results no" symptom for typed text.

### F3 — Limits of the tsvector-prefix approach (constraints for Planner) — **L1 Proven (PG 17.6 local)**

| Probe                                  | Behaviour                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `to_tsquery('german','ist:*')`         | Dropped as a **stopword**, matches nothing. Other short German prefixes that are stopwords behave the same (`der`, `die`, `ein`, …). Prior art: migration 107 (Plan 169) already handled a stopword edge case for categories. |
| `to_tsquery('german','afghanische:*')` | Stemmed to `'afghan':*`, matches "Afghanisches". Good.                                                                                                                                                                        |
| `to_tsquery('german','burger:*')`      | Stemmed to `'burg':*`, which is broader than typed.                                                                                                                                                                           |
| `laden:*` vs "Burgerladen"             | ❌ No match. tsvector cannot match **infix** parts or the second part of a German compound word.                                                                                                                              |

Implication (a finding, not a solution): "partial words" is only achievable with tsvector for **word-prefix** partials. Infix and compound-tail partials ("laden" → "Burgerladen") are outside what tsvector can do. See Open Question Q1.

### F4 — Latent defect in shipped prefix prior art (multi-word queries error) — **L1 (expression) / L2 (prod body)**

`search_food_concepts` (089) and `search_food_categories` (107), plus the baseline copies at `001_baseline.sql` L733/L851/L949, split tokens with the SQL literal `'\\s+'`. With `standard_conforming_strings=on`, that regex means "a backslash followed by one or more `s`", not whitespace. POC:

```
regexp_split_to_array('döner kebab','\\s+')  -> {"döner kebab"}   -- not split
to_tsquery('german','döner kebab:*')          -> ERROR: syntax error in tsquery
```

`search_food_menu_items` (086) uses the correct `'\s+'`. Any multi-word query sent to the two affected RPCs raises an error (the mobile Was? picker shows its error state). This is a trap if Planner reuses 089 or 107 as the template for desktop prefix matching. L2 for production: inferred from the migration and baseline-dump bodies, not queried live.

### F5 — Policy deviations on the paths in scope — **L1 (code inspection)**

- `fetchSearchSuggestions` uses ILIKE on 3 tables ([suggestions.ts](src/services/providers/suggestions.ts#L23-L36)).
- `searchProviders` category branch uses ILIKE ([search.ts](src/services/providers/search.ts#L322)).

Both conflict with the project's "never ILIKE" rule, and both hide F2 by making partial matching look like it works.

### Branch enumeration (State-Machine heuristic)

| Branch                                                                  | Status                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Desktop, provider suggestion, same section, Everywhere or matching city | Works (L1)                                                                                             |
| Desktop, provider suggestion, other section                             | **Broken** (L1, F1b)                                                                                   |
| Desktop, provider suggestion, other city while a city is selected       | **Broken** (L1, F1c)                                                                                   |
| Desktop, menuItem suggestion                                            | **Broken** (L1, F1a)                                                                                   |
| Desktop, cuisine suggestion                                             | Works via ILIKE (L1; policy issue F5)                                                                  |
| Desktop, Enter or search-icon with a partial term                       | **Broken** (L1, F2)                                                                                    |
| Mobile `/search`, dish from offers concept → `/food?q=`                 | Works if the label is an exact offer name (L2)                                                         |
| Mobile `/search`, dish from `food_menu` (`mi:` items) → `/food?q=`      | **Likely broken, same as F1a** (L2: same backend, not rendered)                                        |
| Mobile `/search`, multi-word Was? query                                 | **Errors** (F4, L1 expression / L2 prod)                                                               |
| Ummah / store sections with a partial term                              | Same exact-lexeme limit (L2, same `searchProviders` path)                                              |
| `ProvidersContent` `initialData` reuse is not gated on `q`              | Unverified. SSR re-renders per navigation, so it is probably harmless (L3). Not implicated by any POC. |

## Root Cause

1. **Issue 1 (L1):** the typeahead and the results search are separate systems with different corpora (menu items only in suggestions), different scoping (no section or city filter in suggestions) and different matching (ILIKE substring vs `plainto_tsquery` exact lexeme). A suggestion is therefore no guarantee of a result.
2. **Issue 2 (L1):** the RPCs behind the desktop results path (`search_provider_ids_by_name`, `search_offers`, `search_needs`) only use `plainto_tsquery`. The prefix `:*` pattern from Plans 096/077 was never applied to them.

## System Weaknesses

- **Architecture:** no single source of truth for what is searchable. Suggestions and results can drift apart, and they did.
- **Code:** the prefix-tokenizer SQL is copy-pasted across 3+ functions with a divergent escape (F4). There is no shared helper and no multi-word test.
- **Process/tests:** no test asserts "every suggestion type returns ≥1 result for its own label". The migration test `077-food-search-prefix-rpc-tdd` checks SQL text only, which is how `'\\s+'` got through.

## Instrumentation Gaps

| Signal                                                                                      | Level                                     | Purpose                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `search.results` event: `{section, has_city, q_len, result_count, source: 'suggestion'      | 'typed', suggestion_type}` (no raw query) | Normal                                                      | Zero-result rate per suggestion type. Would have made F1a visible in production. |
| Per-branch match counts in `searchProviders` (name/offers/needs/category)                   | Debug                                     | Shows which branch matched, or that none did.               |
| RPC error logging for `search_food_concepts` / `search_food_categories` with the error code | Normal                                    | Would surface F4 (`syntax error in tsquery`) in production. |

## Remaining Gaps

| #   | Unknown                                                                       | Blocker                           | Required Action                                                                                                                                | Owner      |
| --- | ----------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| G1  | F4 on production: are the deployed function bodies really `'\\s+'`?           | No prod DB access in this session | Run `select prosrc from pg_proc where proname in ('search_food_concepts','search_food_categories')` on UAT, then call one with `'döner kebab'` | Planner/QA |
| G2  | Real-data share of suggestion types (how often menuItem suggestions dominate) | No data access                    | UAT query: count ILIKE hits per table for common prefixes                                                                                      | QA         |
| G3  | Mobile `mi:` dish → `/food?q=` empty-list behaviour                           | Not rendered end-to-end           | QA/UAT manual check on mobile                                                                                                                  | QA         |
| G4  | Stemming differences between local PG 17.6 and Supabase's Postgres version    | Version not confirmed             | `select to_tsvector('german','Döner Kebab Haus')` on UAT                                                                                       | QA         |

## Analysis Recommendations (next steps, not solutions)

- Confirm G1 and G4 on UAT with the 3 read-only queries above before planning migrations.
- Planner should decide the scope of "partial" (Q1) before choosing matching semantics.
- Trace whether the ummah/store sections need the same prefix behaviour, to decide whether one fix or several are needed.

## Open Questions

- **Q1 (user):** Does "partial match" mean **word-prefix** ("Istan" → "Istanbul"), which tsvector `:*` supports, or also **infix/compound** ("laden" → "Burgerladen"), which tsvector cannot do? The second would need a decision beyond "tsvector only".
- **Q2 (user/Planner):** Should suggestions be limited to the active section and city, or should selecting an out-of-scope suggestion widen the result scope?
- **Q3 (Planner):** Should menu-item hits appear in results as their providers (provider list), matching the mobile Was? intent?
