---
ID: 051
Origin: 051
UUID: d7f2b8e3
Status: Planned
---

# Analysis 051: JoinHalal "Angebotene Speisen" → Offers Mapping

**Date**: 2026-03-22
**Analyst**: analyst
**Requested by**: User (feature enhancement to existing JoinHalal import)

## Value Statement and Business Objective

As an admin importing JoinHalal providers, I want the import pipeline to automatically map "Angebotene Speisen" (offered dishes/foods) from each provider's page to UFlow `offers_ids`, so that imported providers arrive with pre-populated offers and users can immediately see what each provider serves.

## Objective

Determine how "Angebotene Speisen" data is structured on joinhalal.com, how it maps to the UFlow `offers` table, and what changes are needed in the import pipeline.

## Context

The current JoinHalal import (Plan 047, released v0.8.4; timeout-hardened in Plan 049, v0.8.10) imports provider records but sets `offers_ids: []` — no offers are mapped. The user requests that the "Angebotene Speisen" field from JoinHalal be mapped to UFlow offers during import.

---

## Methodology

1. Examined the existing import architecture (`src/lib/import/joinhalal.ts`, `src/utils/joinhalal-parser.ts`, `scripts/import-joinhalal.ts`)
2. Examined the UFlow database schema for `offers`, `providers.offers_ids`, and `category_suggested_offers`
3. Analyzed the JoinHalal page structure (Schema.org JSON-LD, Voxel theme config)
4. Identified the data source and extraction path for "Angebotene Speisen"
5. **Live page sampling** (13 pages across restaurant, food-truck, metzgerei categories) to verify field format, delimiter, and vocabulary

---

## Findings

### Finding 1: Data Source — "Angebotene Speisen" on joinhalal.com

**Status**: Verified (live page sampling, 13 pages)

JoinHalal uses a WordPress + Voxel theme stack. "Angebotene Speisen" is stored in the Schema.org JSON-LD as an `additionalProperty` entry with **`name: "Speisen"`** (not "Angebotene Speisen").

**Exact structure** (verified across 13 pages):

```json
{
  "@type": "Restaurant",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "Halal-Merkmale", "value": "Türkisch" },
    { "@type": "PropertyValue", "name": "Speisen", "value": "Döner, Falafel, Pommes" },
    { "@type": "PropertyValue", "name": "Lieferservice", "value": "https://..." }
  ]
}
```

**Key observations**:
- **Field name**: `"Speisen"` (not "Angebotene Speisen")
- **Delimiter**: Comma-separated string (`, `)
- **Values**: German food terms, title-cased, single-word or compound (e.g., "Hot Dog", "Pide/Pizza")
- **Consistency**: Present on all 13 sampled pages (restaurants, food trucks, metzgerei). Can be empty string.
- **Schema @type**: Always `"Restaurant"` regardless of actual category (even food trucks and butchers)
- **Other additionalProperty entries**: `Halal-Merkmale` (cuisine type) and `Lieferservice` (delivery URLs) — not relevant to this feature but available for future use

**Sample data (13 pages)**:

| Page | Speisen |
|---|---|
| echte-baerliner | Döner, Falafel, Pommes |
| safran-coffee-bowl | Bowl, Falafel, Fisch, Pasta, Salat, Wraps, Dessert |
| chickyz-fried-chicken | Burger, Chicken, Pommes |
| crunchies-muenchen | Burger, Chicken, Pommes |
| steak-doener-germering | Döner, Pommes, Reis, Wraps |
| dakju-korean-chicken | Chicken, Pommes, Reis |
| chens-beef-noodles | Chicken, Grill, Manti, Pasta, Salat, Suppe |
| lokmahouse-cafe | Lokma, Waffel, Dessert |
| uzbek-eats | Manti, Pasta, Salat |
| etem-butcher-grill | Adana, Steak, Burger, Chicken, Grill, Köfte, Lamm, Pommes, Salat |
| fat-man-smashburger | Hot Dog, Burger, Chicken |
| pletttoast-by-caygarden | Sandwich, Sucuk |
| loco-chicken | Burger, Chicken, Pommes |

**Evidence**: The `JoinHalalSchemaData` type already defines `additionalProperty` but the field is never extracted or used in the current pipeline. The test fixture shows `additionalProperty: []`.

### Finding 2: UFlow Offers Schema

**Status**: Verified

The `offers` table:

```sql
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  name_de TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES categories(category_id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT offers_name_de_unique UNIQUE (name_de)
);
```

Key characteristics:
- **`name_de` is unique** — each offer is a single German-language term (e.g., "Döner", "Kaffee", "Burger")
- **`offer_id`** is the UUID referenced by `providers.offers_ids` (UUID array with GIN index)
- Offers are **catalog entries** — a fixed vocabulary, not free-text per-provider
- Existing seed offers: Beratung, Coaching, Kurse, Workshops, Mentoring, Networking, Support, Training, Seminare, Webinare
- Migration 007 categorized food-related offers: Kuchen, Kaffee, Gebäck, Gegrilltes, Döner, Burger, Pide/Pizza, Pommes, Frühstück, Brunch, Mittagessen, Catering, etc.

### Finding 3: Provider-to-Offers Relationship

**Status**: Verified

```sql
-- On providers table
offers_ids UUID[] DEFAULT '{}'
-- GIN index for array containment queries
CREATE INDEX idx_providers_offers_ids ON providers USING GIN (offers_ids);
```

The relationship is **array-based denormalized** (not a junction table). Each provider stores an array of `offer_id` UUIDs. This means:

1. Each JoinHalal "Angebotene Speise" must be resolved to an existing `offers.offer_id`
2. If a food item doesn't exist in the offers catalog, it must either be:
   - **Created** as a new offer row, or
   - **Skipped** and reported as unmapped (similar to category mapping)
3. The resolved UUIDs are stored directly in `providers.offers_ids`

### Finding 4: Existing Import Pipeline Architecture

**Status**: Verified

The import pipeline has two paths:

| Path | File | Purpose |
|---|---|---|
| CLI (write mode) | `scripts/import-joinhalal.ts` | Full write pipeline with `--write` flag |
| API (dry-run) | `src/lib/import/joinhalal.ts` | Preview-only via admin dashboard |

Both share the parser (`src/utils/joinhalal-parser.ts`) and core logic. The `transformPage` / `transformPageToProvider` function currently:

1. Extracts Schema.org data via `extractSchemaOrgFromHtml(html)`
2. Extracts display name via `extractDisplayNameFromHtml(html)`
3. Parses address, category, contact info, social links
4. Sets `offers_ids: []` ← **this is the gap**

The architecture already supports the pattern: category resolution uses `CATEGORY_SLUG_MAP` + `resolveCategoryId()` to match source data to UFlow catalog entries. Offers mapping should follow the same pattern.

### Finding 5: Mapping Strategy Options

**Status**: Analysis (determination requires sample data)

| Strategy | Approach | Pros | Cons |
|---|---|---|---|
| **A: Exact match** | Extract "Angebotene Speisen" values, match against existing `offers.name_de` | Simple, no new data created | Misses items not in catalog |
| **B: Match + create** | Match first, create new offer rows for unmatched items | Complete coverage | Could pollute offers catalog with noisy/duplicate entries |
| **C: Match + fuzzy** | Use synonym detection (like migration 009) for flexible matching | Better coverage than exact | Complex, risk of false matches |
| **D: Match + report** | Match against catalog, report unmapped items (like category mapping) | Clean, auditable, consistent with existing pattern | Requires manual follow-up for unmapped items |

**Recommended**: **Strategy D (Match + report)** — consistent with the existing category-mapping pattern, auditable, and safe. New offers can be created via a separate admin step after reviewing the unmapped report.

### Finding 6: CSV vs Live Scrape

**Status**: Verified

The current pipeline does **not use the CSV file** for import. It:
1. Fetches sitemaps from `joinhalal.com/locations-sitemapN.xml`
2. Fetches individual location pages
3. Parses Schema.org JSON-LD from each page's HTML

The CSV is a red herring — "Angebotene Speisen" must be extracted from the **live page HTML**, specifically from the Schema.org `additionalProperty` array or from the Voxel theme DOM/config.

---

## Open Questions — RESOLVED

### OQ-1: Exact field format on joinhalal.com pages ✅ RESOLVED

**Answer**: The field is `additionalProperty[name="Speisen"]`, value is a **comma-separated string** of German food terms. Present on all sampled pages (13/13). Can be empty string when no foods are listed.

- **Field name**: `"Speisen"` (not "Angebotene Speisen")
- **Delimiter**: `, ` (comma + space)
- **Values**: Title-cased German food terms (e.g., "Döner", "Burger", "Falafel", "Pommes")
- **Extraction path**: `schema.additionalProperty?.find(p => p.name === 'Speisen')?.value?.split(', ')`

### OQ-2: Existing offers catalog coverage ✅ RESOLVED

**Answer**: Of the 24 unique Speisen values found in the sample, the following coverage was determined:

| Source Speise | Exists in offers catalog? | Match key |
|---|---|---|
| Adana | ❌ No | — |
| Bowl | ❌ No | — |
| Burger | ✅ Yes | `Burger` (offer_id: 492259b1) |
| Chicken | ❌ No | — |
| Dessert | ❌ No | — |
| Döner | ✅ Yes | `Döner` (known in migration 007/008) |
| Falafel | ❌ No | — |
| Fisch | ❌ No | — |
| Grill | ❌ No | — |
| Hot Dog | ❌ No | — |
| Köfte | ❌ No | — |
| Lamm | ❌ No | — |
| Lokma | ❌ No | — |
| Manti | ❌ No | — |
| Pasta | ❌ No | — |
| Pommes | ✅ Yes | `Pommes` (offer_id: db8cb613) |
| Reis | ❌ No | — |
| Salat | ❌ No | — |
| Sandwich | ❌ No | — |
| Steak | ❌ No | — |
| Sucuk | ❌ No | — |
| Suppe | ❌ No | — |
| Waffel | ❌ No | — |
| Wraps | ❌ No | — |

**Coverage**: **3/24 (12.5%)** of sampled Speisen values match existing offers.

**Implication**: Strategy D (Match + report) will match only ~12% on the initial run. This confirms the analysis recommendation: the Planner should decide whether to:
1. **Pre-seed** the offers catalog with the 21 missing food terms before the import (higher coverage immediately)
2. **Report unmapped** and let an admin decide which to add (safer, more controlled)
3. **Auto-create** missing offer rows during import (highest coverage, but pollutes catalog)

**Recommendation**: **Strategy D + pre-seed migration**. Create a migration to seed the 21 missing food offers (all are legitimate food items from a curated source), then the import matcher will achieve near-100% coverage. This is the cleanest approach: the offers exist in the catalog before the import runs, and the matcher simply resolves them.

---

## Verified Architecture Constraints

1. **`offers.name_de` has a UNIQUE constraint** — cannot insert duplicate offer names
2. **`providers.offers_ids` is a UUID[] array** — stores offer_id references, not names
3. **The import pipeline uses `upsert` with dedup by name+city** — offers resolution must happen before provider insert
4. **Both CLI and API paths share `transformPage`** — offers extraction must be added at the parser level to benefit both paths
5. **The `additionalProperty` type is already defined** in `JoinHalalSchemaData` but unused

---

## Analysis Recommendations

1. **Parser layer** — Add `extractSpeisen(schema: JoinHalalSchemaData): string[]` in `joinhalal-parser.ts`. Pure function: extracts `additionalProperty[name="Speisen"].value`, splits on `, `, trims, filters empty strings. Returns `[]` when field absent or empty.

2. **Resolution layer** — Add `resolveOfferIds(speisen: string[], offers: Offer[]): { matched: string[], unmatchedSpeisen: string[] }` in `joinhalal.ts`. Case-insensitive `name_de` lookup. Returns matched UUIDs and unmatched names for reporting.

3. **Seed migration** — Create a migration to INSERT the 21 missing food offers (Adana, Bowl, Chicken, Dessert, Falafel, Fisch, Grill, Hot Dog, Köfte, Lamm, Lokma, Manti, Pasta, Reis, Salat, Sandwich, Steak, Sucuk, Suppe, Waffel, Wraps) into the `offers` table with `category_id` set to the "Essen & Trinken" category. Use `ON CONFLICT (name_de) DO NOTHING` for idempotency.

4. **Wire into `transformPage` / `transformPageToProvider`** — Both paths call the new extractor and resolver, populating `offers_ids` instead of `[]`. Requires passing the loaded offers list (like categories) to the transform functions.

5. **Unmapped-offers reporting** — Add `unmappedOffers: UnmappedOfferGroup[]` to `DryRunResult` (parallel to `unmappedGroups` for categories). CLI path should also log unmapped offers. This is future-proof: if new Speisen values appear on JoinHalal that aren't in the catalog, the dry-run will surface them.

6. **Offer loading** — Add `loadOffers(supabase)` helper (same pattern as `loadCategories`) to fetch `offer_id, name_de` from `offers` table at the start of the pipeline.

---

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-22T13:30Z | analyst | Initial analysis created |
| 2026-03-22T14:15Z | analyst | Resolved OQ-1 (field name = "Speisen", comma-delimited) and OQ-2 (3/24 = 12.5% coverage). Updated Finding 1 with verified live data. Refined recommendations with seed migration strategy. |
| 2026-03-22T15:42Z | planner | Analysis consumed into Plan 051; Status updated to Planned prior to closure. |
