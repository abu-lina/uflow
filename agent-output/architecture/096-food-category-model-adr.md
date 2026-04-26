---
ID: 096
Origin: 096
UUID: f8d2c4a1
Status: Active
---

# ADR-096: Food Section Category Model — Single Nationality per Provider

## Changelog

| Date              | Handoff   | Request                           | Summary                                                    |
| ----------------- | --------- | --------------------------------- | ---------------------------------------------------------- |
| 2026-04-23T10:00Z | Architect | Design decision: food categories  | Evaluate single vs. multi-category for nationality cuisines |

---

## Status

**ACCEPTED**

## Context

The food section is adding ~22 nationality cuisine categories (Turkish, Arabic, Lebanese, etc.) under `applicable_section = 'food'`. The question is whether a provider should be assigned **one** nationality or **multiple**.

### Forces at play

1. **Current schema**: `providers.category_id` is a single FK to `categories(category_id)`. Every query, filter, card, detail page, and gallery assumes one category per provider.
2. **UI surface area**: CategoryFilter (horizontal pill bar), CategoryGallerySection (home page cards), ProviderDetailPage/Modal (category badge), search API — all use `.eq('category_id', ...)`. Multi-category would require rewriting every touchpoint.
3. **Real-world data**: Most halal restaurants in Germany serve one dominant cuisine. "Fusion" restaurants are rare (<5% of listings). The edge case is real but uncommon.
4. **Platform maturity**: DAU < 5,000. No user feedback requesting multi-cuisine tagging. The enrichment pipeline (Plan 065) assigns categories automatically — single-value assignment is simpler and more reliable.
5. **YAGNI principle**: Multi-category introduces a junction table, changes to every query path, a "primary" vs. "secondary" concept, and a new UI pattern (tag chips) — all for an edge case.
6. **KISS principle**: Single category = one badge on the detail page, one filter dimension, no ambiguity in search results.

### Existing schema touchpoints that assume single category

| Layer       | File / Component                        | Pattern                         |
| ----------- | --------------------------------------- | ------------------------------- |
| DB          | `providers.category_id` FK             | Single UUID                     |
| Service     | `providers.ts` L544, L768-769          | `.eq('category_id', category)`  |
| Filter UI   | `CategoryFilter.tsx`                   | Single-select pill bar          |
| Gallery     | `CategoryGallerySection.tsx`           | `.eq('category_id', categoryId)` |
| Detail page | `ProviderDetailPage.tsx` L66-72        | `getCategoryName(provider.category)` — singular |
| Detail modal| `ProviderDetailModal.tsx`              | Same singular pattern           |
| Search API  | `/api/providers/search/route.ts`       | `category` param → single value |

Changing to multi-category would require modifying **all 7+ touchpoints** plus the junction table, RLS policies, indexes, and search RPCs.

## Decision

**Option A — Single `category_id` FK (keep current schema)**

Each food provider picks **one** nationality cuisine category. The existing `providers.category_id` column is sufficient. No schema change required.

For the rare fusion case: the provider selects their **dominant** cuisine. Their menu items (via `provider_menu_items`) can still contain dishes from multiple cuisines — the item-level search (Plan 094/068) handles cross-cuisine discovery naturally.

## Consequences

### Positive

- **Zero schema changes** — nationality categories are just new rows in `categories` with `applicable_section = 'food'`
- **Zero UI changes** — existing filter, gallery, detail page all work unchanged
- **Zero query changes** — `.eq('category_id', ...)` continues to work
- **Simple enrichment** — automated pipeline assigns one category per provider
- **Clear UX** — user sees one nationality badge, picks one filter; no cognitive load
- **Consistent with other sections** — business and ummah sections also use single category

### Negative

- **Fusion restaurants lose precision** — a Turkish-German fusion restaurant must pick one. Mitigated: their menu items can reflect both cuisines, and item-level search (Was? search) finds cross-cuisine matches.
- **No multi-filter** — users cannot filter "show me Turkish AND Lebanese". Mitigated: at current scale with <100 food providers per city, scrolling is sufficient.

### Neutral

- If multi-category becomes a real user need (measured via feedback or analytics), Option C (add `cuisine_tags TEXT[]` for secondary filtering while keeping primary `category_id`) can be added incrementally without breaking the current model. This is a safe extension path.

## Alternatives Considered

### Option B: Many-to-many via `provider_categories` junction table

**Rejected.** Requires:
- New junction table + RLS policies + indexes
- Rewrite of all 7+ query/filter/UI touchpoints
- "Primary category" concept for detail page header
- Multi-select filter UI (chips/checkboxes instead of pills)
- Complex enrichment logic (assign multiple categories)

All this for ~5% of listings. Violates YAGNI and KISS. The migration cost exceeds the value at current scale.

### Option C: Single primary + `cuisine_tags TEXT[]` column

**Deferred (future extension path).** This is the right escalation if user feedback shows multi-cuisine filtering is needed. It preserves the primary category for display while adding a secondary dimension for search.

Schema would be: `ALTER TABLE providers ADD COLUMN cuisine_tags TEXT[] DEFAULT '{}'` + GIN index. Queries add `OR cuisine_tags @> ARRAY[selected_tag]`. UI adds tag chips below the primary badge.

**Not needed now.** Can be added in a single migration without breaking anything.

## UI Specification (for Planner/Implementer reference)

### Provider Detail Page

- **Category badge**: Single nationality name (e.g., "Türkische Küche") displayed as it is today — `getCategoryName(provider.category)`.
- **No change** to the detail page layout.

### Category Filter (horizontal pill bar)

- **Single-select** behavior unchanged.
- When `applicable_section = 'food'` filter is active, only food categories appear.
- Each pill = one nationality cuisine.

### Search/Filter Behavior

- User selects a nationality → `.eq('category_id', selectedId)` → shows only providers in that cuisine.
- "Alle" (All) → shows all food providers regardless of nationality.
- Was? search (item-level via `provider_menu_items`) naturally crosses cuisine boundaries — a user searching "Döner" will find it regardless of which nationality the provider is categorized under.

## Related

- ADR-094: Offers schema evolution (established `provider_menu_items`)
- ADR-095: Three-section catalog hierarchy (established `applicable_section`)
- Plan 068: Provider catalog tables (item-level search)

---

## Architect Verdict

**APPROVED — Option A (single category_id, no schema change)**

The SQL to insert the 22 nationality categories (provided in the prior conversation turn) is sufficient. No migration needed beyond the INSERT. The Planner can proceed directly to implementation of the category seed data.

Gate: ADR recorded. Planner may create implementation plan.
