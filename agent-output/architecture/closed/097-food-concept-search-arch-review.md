---
ID: 097
Origin: 097
UUID: b9e14a3c
DocType: ArchitectureReview
Status: Released
---

# Architecture Review — Plan 097: Food Concept Search

| Field | Value |
|-------|-------|
| Plan | [097-food-concept-search-plan.md](../planning/097-food-concept-search-plan.md) |
| Reviewer | architect |
| Review Date | 2026-04-21T13:30Z |
| Verdict | **APPROVED_WITH_CHANGES** |

---

## Changelog

| Date | Event | Notes |
|------|-------|-------|
| 2026-04-21T13:10Z | Initial draft created alongside plan | Preliminary review |
| 2026-04-21T13:30Z | Full critical review completed | 1 MUST-FIX, 2 SHOULD-FIX, 1 NOTED; verdict upgraded to APPROVED_WITH_CHANGES |
| 2026-04-21T13:35Z | Planner applied F1/F2/F3 to plan | All findings resolved; plan ready for Critic |

---

## Summary

Plan 097 wires Was? search to the correct data layer — the `offers` vocabulary table joined against `providers.offers_ids`. The approach is consistent with UFlow's Postgres-first philosophy. No external services are introduced. All required indexes already exist. The migration is purely additive (`CREATE OR REPLACE FUNCTION`) — safe to run in production without a maintenance window.

However, the plan has **one functional gap that must be fixed before implementation** (dual-language tsvector search) and **two implementation concerns** that must be addressed.

---

## Architecture Assessment

### 1. Data Model Alignment ✅

The `offers` vocabulary + `providers.offers_ids UUID[]` design is a deliberate denormalised structure optimised for exactly this query pattern:

```
offers (vocabulary) ←→ providers.offers_ids (GIN-indexed array bridge)
```

Plan 097 uses this model correctly. The vocabulary table holds one canonical row per concept (e.g., "Döner") — querying it directly eliminates the duplicate-per-restaurant problem that would arise from querying `provider_menu_items`.

No new tables. No schema changes to `providers` or `offers`. Migration slot `070` is confirmed free.

**Confidence**: Proven — verified by reading migrations 000, 001, 014, 067, 068, 069.

---

### 2. Dual-Language tsvector Search — MUST-FIX 🔴

**Finding**: The plan's M1 logic requirements specify "German tsvector (reuse existing GIN indexes from migration 014)". The illustrative SQL only uses a German tsvector configuration. However, the existing `search_offers` RPC (migration 014) searches **both** German and English configurations:

```sql
-- Migration 014 search_offers WHERE clause:
WHERE search_query = '' OR 
  to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, ''))
    @@ plainto_tsquery('german', search_query) OR
  to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, ''))
    @@ plainto_tsquery('english', search_query)
```

The `offers.name_en` column contains English dish names (e.g., "Chicken Shawarma"). Searching only with the German config means:
- A user typing "chicken" would match the raw text but **not** benefit from English stemming ("chickens" → "chicken")
- A user typing an English-only term not present in `name_de` could miss results entirely

**Required change to Plan 097 M1**: Add dual-language tsvector matching to the logic requirements:
- Primary: `to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, ''))` — covered by `idx_offers_combined_search` GIN index
- Secondary: `to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, ''))` — **no matching GIN index** (pre-existing gap from migration 014)

**Pre-existing index gap note**: The English tsvector expression in `search_offers` concatenates `name_en || name_de` (reversed order from the German expression). No GIN index matches this expression. This is a pre-existing gap — the English branch in `search_offers` already does a sequential scan. For the new `search_food_concepts` RPC, the same pattern is acceptable because the German branch will do the heavy lifting via the GIN index, and the English branch acts as a catch-all.

**Severity**: MUST-FIX — functional correctness gap. Without English matching, results degrade for bilingual users.

---

### 3. GIN Index Usage (`@>` operator) — SHOULD-FIX 🟡

**Concern**: The query joins `offers → providers` via an array containment check on `providers.offers_ids`. The GIN index `idx_providers_offers_ids` (migration 001) enables fast lookups only with the `@>` containment operator.

**Requirement**: The RPC **must** use the containment form:
```sql
p.offers_ids @> ARRAY[o.offer_id]
```

The `ANY` form (`o.offer_id = ANY(p.offers_ids)`) may be rewritten by the Postgres planner to use the GIN index, but this is **not guaranteed** across all Postgres versions and with all query shapes. The `@>` operator is the GIN-native containment operator and guarantees index use.

The plan correctly specifies this in D3. Repeating here for emphasis.

**Implementer action required**: After writing the migration, run on UAT:
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT o.offer_id, o.name_de, COUNT(DISTINCT p.provider_id)
FROM offers o 
INNER JOIN providers p ON p.offers_ids @> ARRAY[o.offer_id]
WHERE p.listing_type = 'food' AND p.review_status = 'approved'
  AND to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, ''))
      @@ plainto_tsquery('german', 'döner')
GROUP BY o.offer_id, o.name_de;
```

Confirm the plan shows `Bitmap Index Scan on idx_providers_offers_ids`. If not, escalate.

**Severity**: SHOULD-FIX — plan already has this right (D3); implementer must not deviate.

---

### 4. Query Shape: `offers → providers` JOIN + GROUP BY ✅

The join direction (iterate offers, join to providers) is correct:

- tsvector GIN index on offers narrows to N matching concepts first
- `@>` containment probes the providers GIN index only for those N offers
- GROUP BY at the `offer_id` level gives `COUNT(DISTINCT provider_id)` without materialising all pairs

At current dataset sizes (hundreds of food providers, ~thousands of offers), this is efficient.

**Scale note**: If dataset grows to tens of thousands of food providers, the GROUP BY aggregation could slow. A `materialized view` refreshed nightly would be the natural next step. For current DAU this is unnecessary (YAGNI).

---

### 5. `onSelect` Callback and User Journey — SHOULD-FIX 🟡

**Finding**: The current `WasMealResults.onSelect` passes `item.name_de` to the page, which uses it for... what? Looking at the page wiring (line ~148+), after selection the user presumably navigates or filters. But Plan 097 changes the result type from a per-provider item (which could navigate to a provider detail page) to a vocabulary concept (which has no single destination).

**Gap**: The plan doesn't specify what happens when a user taps a food concept result. The current flow passes `name_de` upstream, but Plan 097 should clarify:
- Does tapping "Döner" filter the provider list to show only döner restaurants?
- Does it populate the Was? input with "Döner" and trigger a secondary search?
- Or is this a deferred UX decision?

**Required change to Plan 097**: Add an explicit decision (D12) documenting the `onSelect` UX. Even if the behaviour is "populate the input and let the user see the results" (current Plan 096 behavior), this should be stated.

**Severity**: SHOULD-FIX — UX ambiguity; implementer will need to make a judgement call without guidance.

---

### 6. RPC Security Posture ✅

`SECURITY INVOKER` (consistent with migration 068 pattern) is correct. The function reads public vocabulary (`offers`) and approved provider data — no row-level security bypass is needed. The `review_status = 'approved'` filter inside the RPC ensures only visible provider data contributes.

---

### 7. Existing `search_offers` RPC Compatibility ✅

The existing `search_offers` RPC (migration 014) is untouched. It returns all matching offers from the vocabulary without provider filtering — useful for admin/content tooling. No conflict.

---

### 8. Service Layer Placement ✅

Adding `searchFoodConcepts` to `src/services/offers.ts` is correct. Food concepts are offer vocabulary items — same domain as `searchOffers`. A separate file would violate cohesion.

The existing `searchOffers` in `src/services/offers.ts` has an ILIKE fallback for migration-period robustness. The new `searchFoodConcepts` should **not** include such a fallback — the `search_food_concepts` RPC is being created as part of this plan and is guaranteed to exist post-deployment. The plan is silent on this but the intent is clear.

---

### 9. Component Coupling ✅

`WasMealResults` is a domain-specific feature component (Plan 096, `src/features/search/`). No external consumers yet. The prop type change from `ProviderMenuItem[]` to `FoodConcept[]` is low-risk.

**Implementation detail**: The current component uses `item.item_id` as the React `key` prop. After the type change, this must become `item.offer_id`. The plan doesn't explicitly call this out but it's implicit in the type change. Implementer should catch this.

---

### 10. Effect Removal from Page ✅

Removing the provider lookup `useEffect` is architecturally correct. The previous effect fetched all providers to build a `providerLookup` map for enriching `ProviderMenuItemRaw` rows with `provider_name` and `provider_image`. With vocabulary-backed results, provider metadata isn't needed — `provider_count` is returned directly by the RPC. One fewer Supabase query per page load is a meaningful improvement.

---

### 11. i18n Plural Handling — NOTED ⚠️

`"{{count}} Restaurants"` will display "1 Restaurants" for a single-provider result.

**Acceptable for v1**. The implementer should:
- Check if `useLanguage().t` supports ICU `{count, plural, one {...} other {...}}` syntax
- If yes: implement pluralisation inline
- If no: ship the flat string and file a follow-up

**Severity**: NOTED — cosmetic, no architectural impact.

---

## Decisions Reviewed

| Decision | Architectural Assessment | Status |
|----------|--------------------------|--------|
| D1 — Migration `070_search_food_concepts_rpc.sql` | Correct slot; additive only | ✅ |
| D2 — Filter `listing_type = 'food'` AND `review_status = 'approved'` | Correct; scoped to live food restaurants | ✅ |
| D3 — `@>` containment form for GIN index | **Required** — see Section 3 | ✅ |
| D4 — Return `(offer_id, name_de, name_en, provider_count)` | Minimal shape; sufficient for UI | ✅ |
| D5 — Display "N Restaurants" on line 2 | Acceptable for v1; plural note (Section 11) | ⚠️ |
| D6 — `searchFoodConcepts` in `src/services/offers.ts` | Correct placement per cohesion | ✅ |
| D7 — `WasMealResults` prop type changed | Clean; no external consumers | ✅ |
| D8 — Provider lookup effect removed | Reduces query count; correct | ✅ |
| D9 — `search_provider_items` preserved | Future per-provider menu page | ✅ |
| D10 — 6 locale files updated | Standard pattern | ✅ |
| D11 — RPC hardcodes food filter | YAGNI; correct | ✅ |
| **MISSING: D12** — `onSelect` user journey | **Must be added** — see Section 5 | 🟡 |

---

## Required Changes Before Implementation

### 🔴 MUST-FIX (blocks implementation)

**F1 — Add dual-language tsvector matching to M1 logic requirements**

The RPC must search both German and English tsvector configurations, consistent with the existing `search_offers` pattern (migration 014). Update M1 "Logic requirements" bullet 1:

> Search `public.offers` by `name_de`/`name_en` using **both German and English** tsvector configurations. German: `to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, ''))` — covered by `idx_offers_combined_search` GIN index. English: `to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, ''))` — no GIN index (pre-existing gap; acceptable). Match on EITHER for inclusiveness.

### 🟡 SHOULD-FIX (does not block, but must be resolved before M3/M4)

**F2 — Add D12: `onSelect` user journey decision**

Document what happens when a user taps a food concept result. Options:
- a) Populate the Was? input with `name_de` (current Plan 096 behavior — lowest change)
- b) Filter the provider list below to show only providers with that `offer_id`
- c) Navigate to a concept detail page (future — defer)

Recommendation: (a) for v1, note (b) as follow-up.

**F3 — Note `item.offer_id` as React key in M3**

Add to M3 changes: "React `key` prop changes from `item.item_id` to `item.offer_id`."

---

## Verdict

**APPROVED_WITH_CHANGES**

| # | Finding | Severity | Blocks? |
|---|---------|----------|---------|
| F1 | Dual-language tsvector missing from M1 | MUST-FIX | Yes |
| F2 | `onSelect` UX undefined (add D12) | SHOULD-FIX | No (but resolve before M3) |
| F3 | React key prop not called out in M3 | SHOULD-FIX | No |
| N1 | i18n plural "1 Restaurants" | NOTED | No |
| N2 | GIN `@>` verification (already in D3) | NOTED | No — verify at QA |

**Gate**: Apply F1 to plan before handing off to Implementer. F2 and F3 can be resolved by Planner or Implementer.

---

*Session: S96-meal-search-was | Root: /Users/NARAFIQ/Projects/uflow-wt/S96-meal-search-was*
