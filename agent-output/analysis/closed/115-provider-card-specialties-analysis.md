---
ID: 115
Origin: 115
UUID: b7e3a91f
Status: Planned
---

# 115 — Provider Card Specialty Tags Analysis

## Changelog

| Date       | Event                                    |
|------------|------------------------------------------|
| 2026-04-29 | Created. Analyst investigation complete. |

## Value Statement & Business Objective

Real user feedback ("vielleicht noch einbauen für was die bekannt sind, also Shawarma usw") indicates the food provider cards lack at-a-glance dish/specialty information. Adding "known for" tags (e.g., Shawarma, Falafel, Kebab) to the card bottom would significantly improve food discovery UX — users can immediately see whether a restaurant matches what they're craving.

**Alignment**: Supports the core UFlow mission of connecting users with services. Improves information density on cards without redesign.

## Context

- **Scope**: Food section (`listing_type = 'food'`) provider cards on the main discovery page.
- **Current card bottom layout**: Provider name → address → badges → halal stars/Barakah → barakah_effects.
- **User screenshot**: Shows two food provider cards ("Restaurant Bagdad", "Imbiss Bagdad 2") displaying category badge "Arabic", name, and truncated address. No dish/specialty info visible.

## Methodology

- **Upstream Tracing**: Traced data flow from DB → `searchProviders()` → `SearchResultsList` → `ProviderCard` render.
- **Component Isolation**: Inspected ProviderCard props interface and render output.
- **Schema Inspection**: Examined `offers`, `provider_menu_items`, and `categories` tables.
- **Import Pipeline Review**: Traced JoinHalal import's `extractSpeisen()` → `resolveOfferIds()` → `offers_ids` population.

## Findings

### F1: `offers` data IS fetched in `searchProviders()` but NOT rendered on cards — **L1 Proven**

In [src/services/providers.ts](../../src/services/providers.ts#L579-L605):
- `searchProviders()` batch-fetches all offers from the `offers` table using `offers_ids` arrays.
- Builds an `offersMap` and attaches `offers: Array<{ name_de: string }>` to each provider.
- The `transformProviderToSearchResult()` function passes `offers` through to `SearchResult`.

However, in [src/components/providers/SearchResultsList.tsx](../../src/components/providers/SearchResultsList.tsx#L98-L117):
- The `searchResultToProvider()` mapping passes `offers_ids` but **does NOT pass `offers`**.
- `ProviderCard` receives no `offers` data and does not render it.

### F2: `offers_ids` ARE populated for JoinHalal food imports — **L1 Proven**

The JoinHalal import pipeline ([src/lib/import/joinhalal.ts](../../src/lib/import/joinhalal.ts#L489-L490)):
1. `extractSpeisen(schema)` parses the `additionalProperty[name="Speisen"]` field from Schema.org JSON-LD (comma-separated dish names like "Shawarma, Falafel, Döner").
2. `resolveOfferIds(speisen, offers)` matches against the global `offers` vocabulary table.
3. `createMissingOffers()` auto-creates any unmatched Speisen as new offer rows (Plan 053).
4. The resulting `offers_ids` UUIDs are stored on the provider row.

**Implication**: Food providers imported from JoinHalal have their `offers_ids` populated with dish/concept UUIDs. These are resolvable to human-readable names via the `offers` table.

### F3: Two data sources exist for food items — **L1 Proven**

| Source | Table | Granularity | Coverage |
|--------|-------|-------------|----------|
| **Offers vocabulary** | `public.offers` | Global canonical concepts (e.g., "Shawarma", "Pizza") | Populated for JoinHalal imports via `offers_ids` on providers |
| **Menu items** | `public.provider_menu_items` | Per-provider menu items with price, availability, allergens | Typed/ordering-ready; has `offer_tag_id` bridge to offers |

The `offers` table is the right source for card tags — it contains short, canonical dish names (1–2 words). Menu items are more granular (include prices, descriptions) and better suited for a provider detail view.

### F4: `ProviderCard` already accepts but ignores offers — **L1 Proven**

The `ProviderCardProps` interface extends `Provider` (which includes `offers?: Array<{ name_de: string }>`), but the render output never references `offers`. The data pipeline is:

```
DB → searchProviders() [✅ fetches offers] 
  → transformProviderToSearchResult() [✅ passes offers]
    → SearchResultsList.searchResultToProvider() [❌ drops offers]
      → ProviderCard [❌ never renders offers]
```

### F5: Typical offer count per food provider — **L3 Inferred**

Based on the JoinHalal parser:
- `extractSpeisen()` splits on commas from the Schema.org `Speisen` property.
- Typical JoinHalal listings contain 3–8 Speisen terms (e.g., "Shawarma, Falafel, Döner, Lahmacun, Manti").
- The `WasMealResults` component (used in the "Was?" search) shows `items.slice(0, 3)` by default with a "Show all" button, suggesting 3 is the expected visible count.

**Recommendation**: Show max 2–3 offer tags on the card, with a `+N` overflow indicator (matching the existing badges truncation pattern).

### F6: `getProviders()` does NOT fetch offers — **L1 Proven**

The simpler `getProviders()` function ([src/services/providers.ts](../../src/services/providers.ts#L354)) only selects `*, category:categories(name_de, name_en)` — no offers join. If any code path uses `getProviders()` to populate cards (e.g., ExploreSection), those cards would have empty offers.

Only `searchProviders()` and `getProviderById()` fetch the related offers data.

## Data Flow Fix Required

Two gaps must be closed:

1. **`SearchResultsList.searchResultToProvider()`** must pass `offers: result.offers` to the provider object.
2. **`ProviderCard`** must render the `offers` array as specialty tags between address and badges.

No new database columns, migrations, or API changes are needed.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact offer count distribution across live food providers | Cannot query production DB from analysis | Run `SELECT provider_id, array_length(offers_ids, 1) FROM providers WHERE listing_type = 'food' AND review_status = 'approved'` against prod/UAT to confirm typical counts | Planner/DevOps |
| 2 | Whether `getProviders()` is used for card rendering anywhere | Low risk — only `ExploreSection` uses it | Verify in Planner; if so, add offers fetch there too | Planner |
| 3 | Multilingual offer names (`name_en` availability) | `name_en` is nullable on offers | Planner should decide: show `name_de` always (German-first market), or prefer `name_en` for non-DE users | Planner |
| 4 | Manually-created providers (non-JoinHalal) may have empty `offers_ids` | No import pipeline populates them | For MVP: show tags only when offers exist (graceful empty state). Long-term: admin UI to link offers | Planner |

## Analysis Recommendations

1. **Verify offer count distribution** on UAT/prod to confirm the 2–3 tag truncation strategy is appropriate.
2. **Trace all `ProviderCard` call sites** (SearchResultsList, ExploreSection, ProvidersList, bookmarks) to ensure offers data is available in each path.
3. **Decide i18n strategy** for offer names: German-only (simpler, aligned with market) vs. language-aware (requires `name_en` population).
4. **Consider visual design**: The existing `BadgeLabel` component or a simpler text-based tag (like the `barakah_effects` rendering pattern at [ProviderCard.tsx](../../src/components/providers/ProviderCard.tsx#L497)) could be reused for offer tags.
