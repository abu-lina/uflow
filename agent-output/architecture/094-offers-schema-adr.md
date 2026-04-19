# ADR-094: Polymorphic Offer Schema for Food Menu Items and Business Service Offers

## Status
Proposed

## Changelog

| Date | Change | Context |
|------|--------|---------|
| 2026-04-19 | Initial draft | Session S094 — Architect investigation |

## Origin
Plan #094 · Session S094-offers-schema

---

## Context

### Current State

The `offers` table is a **shared vocabulary table** — a global taxonomy of service/product labels that providers tag themselves with. A restaurant and a legal consultancy can both reference the same `offers_ids[]` UUID for the tag "Beratung". The table schema (cumulative from migrations 000–014) is:

```
public.offers
├── id            UUID PK
├── offer_id      UUID UNIQUE
├── name_de       TEXT NOT NULL UNIQUE
├── name_en       TEXT
├── category_id   UUID FK → categories(category_id)
├── created_by    UUID FK → auth.users(id)
├── created_at    TIMESTAMPTZ
└── updated_at    TIMESTAMPTZ
```

`providers.offers_ids UUID[]` (GIN-indexed) links providers to these shared tags. The `search_offers` RPC (migration 014) performs tsvector search over `name_de`/`name_en` and returns matching tag IDs. The providers listing then filters by `offers_ids.cs.{...}`.

Migration 067 introduced `providers.listing_type` (`food | business` enum), enabling the three-section UI (FOOD / UMMAH / BUSINESS). This discriminator exists on providers — not on offers themselves.

### The Problem

The vocabulary model is **semantically broken for the required use cases**:

| Use case | What's needed | What current model provides |
|----------|---------------|----------------------------|
| "Döner" at Restaurant A | Item with price €5.50, photo, availability | A shared tag "Döner" used by all kebab restaurants |
| Haircut booking at Barber B | Service: 30min, €25, online booking | A shared tag "Friseur" |
| Consumer ordering | Cart item with price + provider context | No mechanism — tags have no price |
| Menu comparison between food providers | Provider-specific item details | One row shared across all providers |

The current model answers: **which providers offer a type of service?**  
The required model answers: **what specific items/services does this provider offer, at what price and conditions?**

This is a semantic shift from a **classification system** to an **inventory/catalog system**.

### Forces at Play

1. **tsvector search must be preserved** — the GIN indexes and `search_offers` RPC are already in production
2. **RLS coverage** — provider-specific offer rows require RLS tied to provider ownership
3. **Backward compat** — existing vocabulary search (Was? → tag → providers) still has value
4. **Future ordering** — ordering requires price, availability, stock, provider FK — these must be queryable columns, not JSONB blobs
5. **German locale** — tsvector search uses `german` configuration; food item names are mostly German
6. **Low DAU** — no need to over-engineer; Postgres can handle this natively

---

## Decision

**Adopt Pattern C: Separate Typed Instance Tables with Vocabulary Bridge**

### Recommended Schema

```sql
-- New: Per-provider food menu items (FOOD section providers)
CREATE TABLE public.provider_menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_tag_id    UUID REFERENCES public.offers(offer_id) ON DELETE SET NULL,  -- optional vocabulary link
  name_de         TEXT NOT NULL,
  name_en         TEXT,
  description_de  TEXT,
  price_cents     INTEGER,           -- stored in Euro cents, NULL = price on request
  price_currency  TEXT DEFAULT 'EUR',
  is_available    BOOLEAN NOT NULL DEFAULT true,
  image_path      TEXT,              -- Supabase Storage path
  allergens       TEXT[],            -- e.g. ['gluten', 'lactose']
  is_halal        BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- tsvector stored column for fast search
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('german', coalesce(name_de, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(description_de, ''))
  ) STORED
);

CREATE INDEX idx_provider_menu_items_provider_id
  ON public.provider_menu_items (provider_id);
CREATE INDEX idx_provider_menu_items_search
  ON public.provider_menu_items USING gin(search_vector);
CREATE INDEX idx_provider_menu_items_available
  ON public.provider_menu_items (provider_id) WHERE is_available = true;

-- New: Per-provider service offers (BUSINESS section providers)
CREATE TABLE public.provider_service_offers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_tag_id        UUID REFERENCES public.offers(offer_id) ON DELETE SET NULL,  -- optional vocabulary link
  name_de             TEXT NOT NULL,
  name_en             TEXT,
  description_de      TEXT,
  price_cents         INTEGER,          -- NULL = free consultation / price on request
  price_currency      TEXT DEFAULT 'EUR',
  duration_minutes    INTEGER,          -- NULL = variable
  booking_url         TEXT,             -- external booking link or internal
  is_available        BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector       TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('german', coalesce(name_de, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(description_de, ''))
  ) STORED
);

CREATE INDEX idx_provider_service_offers_provider_id
  ON public.provider_service_offers (provider_id);
CREATE INDEX idx_provider_service_offers_search
  ON public.provider_service_offers USING gin(search_vector);
```

### Key Design Decisions

**D1 — Stored `TSVECTOR` Column (not functional index)**  
Use `GENERATED ALWAYS AS ... STORED` for the search vector rather than a functional GIN index. This avoids re-computing the vector at query time on large joins, keeps `EXPLAIN` simpler, and the stored column is compatible with Supabase's RPC approach.

**D2 — `offer_tag_id` Nullable Bridge**  
Optional FK back to the global `offers` vocabulary. When a provider adds "Döner" as a menu item, they may (optionally) link to the global "Döner" tag. This preserves backward-compatible vocabulary search AND enables provider-level item detail search. Providers creating bespoke items with no vocabulary equivalent leave this NULL.

**D3 — Separate Tables (not STI)**  
`provider_menu_items` and `provider_service_offers` are separate tables (Class Table Inheritance) rather than a single wide table with NULLable columns. Rationale: `allergens`, `is_halal` are food-specific; `duration_minutes`, `booking_url` are service-specific. A wide table with 40% NULL columns degrades query planning and becomes a maintenance hazard as ordering logic adds more type-specific fields.

**D4 — No JSONB for Ordering-Critical Fields**  
`price_cents`, `is_available`, `duration_minutes` are ordering-critical. These MUST be queryable columns, not JSONB. JSONB is reserved for supplementary display-only metadata (e.g., allergen display labels, variant descriptions) where no index or ordering is needed.

**D5 — Existing `offers` Vocabulary Preserved**  
The global `offers` table remains unchanged. `providers.offers_ids[]` is preserved for the legacy vocabulary relationship. This is NOT deprecated — it still drives category-level Was? search. The new tables add *instance-level* data on top.

**D6 — RLS Pattern**  
Both new tables require RLS policies:
- SELECT: `true` (public read, consistent with providers)  
- INSERT/UPDATE: `provider_id IN (SELECT provider_id FROM providers WHERE provider_owner_id = auth.uid())`
- DELETE: same as UPDATE  
This mirrors the existing provider ownership RLS pattern and avoids a new `SECURITY DEFINER` function per operation.

**D7 — Future Ordering Reference**  
An `orders` table should reference either `provider_menu_items.id` OR `provider_service_offers.id` via a polymorphic FK or a union-compatible `orderable_item_id` approach (decided separately in an ordering ADR). The `provider_id` column on both tables enables order attribution without a join to a polymorphic table.

---

## Consequences

### Positive

- **Clean semantic model**: vocabulary tags and provider-specific catalog items are distinct concepts with distinct tables
- **tsvector-ready**: stored TSVECTOR columns on both new tables enable fast full-text search without new functional indexes
- **Ordering-safe**: price, availability, provider FK are queryable typed columns, not JSONB blobs
- **Backward compatible**: existing vocabulary search path (`search_offers` RPC → `offers_ids.cs.{...}`) is fully preserved; no breaking migration
- **RLS natural fit**: provider ownership FK makes row-level policies straightforward
- **GIN indexes maintainable**: separate GIN indexes per table keeps vacuum/autovacuum scope narrow

### Negative

- **New search surface**: searching "across all provider items" requires a new RPC that does `UNION ALL` across both tables (or a materialized view) — cannot reuse `search_offers` RPC as-is
- **Two additional tables**: adds schema complexity; provider onboarding UI must handle both food (menu) and service (catalog) creation flows
- **Dual indexing cost**: `name_de`/`name_en` is indexed in both the vocabulary `offers` table and in the instance tables — small storage overhead, acceptable until DAU > 50,000

### Neutral

- `offer_tag_id` bridge creates an optional dependency; enforcement is application-layer, not FK constraint (nullable)
- Migration sequencing: both tables can be added independently with zero downtime (no modification to existing tables)

---

## Alternatives Considered

### Alternative A: JSONB Metadata Column on Existing `offers` Table

**Approach**: Add `offer_type TEXT`, `provider_id UUID`, and `metadata JSONB` to the `offers` table, turning it from a shared vocabulary into a per-provider instance table.

**Why rejected**:
1. **Semantic corruption**: The `offers` table is currently a shared vocabulary. Adding `provider_id` would mean "Döner" exists N times (once per restaurant), breaking the current vocabulary lookup that powers `providers.offers_ids[]`.
2. **JSONB is wrong for ordering**: `price_cents` and `is_available` MUST be typed columns for ordering carting logic; putting them in JSONB requires `(metadata->>'price_cents')::int` everywhere — fragile and non-indexable without explicit GIN/path index.
3. **Single table of mixed types**: Shared vocabulary rows and provider-instance rows in the same table share a `name_de` UNIQUE constraint that would need to be dropped — a breaking migration.

**Acceptable use of JSONB**: supplementary display metadata (allergen labels, variant names, custom attributes) where no filtering or ordering is needed. Use alongside, not instead of, typed columns.

### Alternative B: Single-Table Inheritance (Wide Table)

**Approach**: Add `offer_type enum('vocabulary', 'food_item', 'service')`, `provider_id`, and all type-specific columns to the existing `offers` table (nullable per type).

**Why rejected**:
1. **Sparse columns**: `allergens`, `is_halal`, `booking_url`, `duration_minutes` are mutually exclusive by type — a wide table with ~40% NULL columns per row is a schema smell and degrades autovacuum efficiency on a table that may grow to millions of rows.
2. **UNIQUE constraint on `name_de` must be dropped** (same problem as Alternative A).
3. **RLS complexity**: mixing public vocabulary rows (no `provider_id`) with provider-owned rows in one table requires policy conditions with `IS NULL` guards — fragile and harder to audit.
4. **Type safety**: adding a new offer type (e.g., digital products) requires ALTER TABLE to add more nullable columns, with risk of forgetting constraints.

**When STI is acceptable**: 2–3 types with ≤ 5 type-specific columns total. Here, food items and services each have 5–8 distinct columns, putting this at the edge of acceptable.

### Alternative D: Materialized View Flattening Everything

**Approach**: Keep vocabulary as-is; create a materialized view that denormalizes provider-specific offer details (fetched from elsewhere) alongside vocabulary tags.

**Why not primary solution**: Materialized views are not writable — you cannot INSERT/UPDATE menu items through a view. They would be useful as a *search layer* on top of the pattern C tables, but cannot replace them for CRUD operations.

---

## Search Integration Assessment

### Was? Input Wiring Status: CURRENTLY WIRED (vocabulary search)

The Was? input is **fully wired end-to-end** through the existing stack:

```
SearchBar.tsx (Was? input)
  → setSearchQuery(value)
  → URL param ?q=
  → ProvidersContent.tsx fetchProvidersFromAPI(query)
  → /api/providers/search route
  → services/providers.ts getProviders(query)
  → searchOffers(query) [parallel with searchNeeds + provider name]
  → supabase.rpc('search_offers', { search_query: query })  ← GIN tsvector index
  → returns offer_ids
  → providers.offers_ids.cs.{offer_ids}  ← GIN array containment
```

**No code change is needed to wire Was? for vocabulary-level search.** The `search_offers` RPC and all indexes are in place.

### What Changes After Schema Evolution

Once `provider_menu_items` and `provider_service_offers` are created, a new `search_provider_items` RPC will be needed to search within provider-specific catalog items. This enables searching "Döner €5" or "30 min Haarschnitt" — item-level, not vocabulary-level.

The two search modes are **complementary**, not mutually exclusive:

| Search mode | What it finds | RPC | Status |
|-------------|---------------|-----|--------|
| Vocabulary search | Providers that offer a *type* of service | `search_offers` | ✅ Live |
| Item search | Specific menu items / service instances from a provider | `search_provider_items` (new) | ⛔ Requires schema migration first |

### Migration Sequencing

The Was? input **can be deployed as-is** (vocabulary search). Item-level search must wait for:

1. `provider_menu_items` and `provider_service_offers` tables (new migration ~068)
2. `search_provider_items` RPC that does `UNION ALL` search across both tables (same migration)
3. UI update to include item-level results in the search results pane (separate ticket)

**No blocker** to shipping vocabulary Was? search now. Schema migration is prerequisite only for item-level drill-down.

---

## RLS Implications

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `offers` (existing) | public | authenticated | authenticated | owner only |
| `provider_menu_items` | public | provider owner | provider owner | provider owner |
| `provider_service_offers` | public | provider owner | provider owner | provider owner |

Provider ownership check pattern (mirrors existing `providers` RLS):

```sql
-- Example: INSERT policy for provider_menu_items
CREATE POLICY "Provider owners can insert menu items"
ON public.provider_menu_items FOR INSERT
WITH CHECK (
  provider_id IN (
    SELECT provider_id FROM public.providers
    WHERE provider_owner_id = auth.uid()
  )
);
```

⚠️ **RLS performance note**: The `provider_id IN (SELECT ...)` subquery pattern must be tested with `EXPLAIN (ANALYZE, BUFFERS)` against the providers table. If the providers table grows large, replace with a direct join or a `SECURITY DEFINER` helper function that returns the authenticated user's `provider_ids[]` array.

---

## Observability Requirements

### Normal (always-on)
- Log count of `provider_menu_items` and `provider_service_offers` rows per `provider_id` on provider profile loads (add to provider stats materialized view from migration 055)
- Structured error logging when `search_provider_items` RPC fails — log `provider_id`, `query`, error code (no PII)
- Search result distribution metric: vocabulary-hit vs item-hit ratio (add to `/api/providers/search` response headers or a Supabase Edge Function log)

### Debug (opt-in)
- Full `EXPLAIN ANALYZE` output for `search_provider_items` — only in non-production or with explicit `X-Debug-Search: true` header
- tsvector `ts_rank` score logging per result row — verbose, disable in production by default

---

## Related

- **ADR in system-architecture.md** (Plan 089): `listing_type` discriminator on `providers` — `food | business` enum provides the section context that governs which table is relevant per provider
- **Migration 067**: `listing_type_enum`, `halal_level`, boolean filter columns — the FOOD/BUSINESS split is already encoded on `providers`
- **Migration 014**: `search_offers` RPC and GIN indexes — preserved as-is under this ADR
- **Migration 055**: `provider_stats` materialized view — should be extended to include item counts when new tables land
- **Ordering ADR (future, ~ADR-097)**: polymorphic order line item FK pattern for `provider_menu_items` and `provider_service_offers`

---

## Verdict

**APPROVED_WITH_CHANGES**

The recommended pattern (Pattern C: Separate Typed Instance Tables) is approved as the architectural direction. Before implementation proceeds, the Planner must include:

1. **Migration 068 scope**: `provider_menu_items` + `provider_service_offers` + `search_provider_items` RPC + RLS policies — all in a single migration for transactional consistency
2. **Provider stats materialized view extension** (migration 055) — add item counts, refresh trigger
3. **No JSONB for price/availability** — explicit compliance check in Critic review
4. **RLS performance validation** — `EXPLAIN (ANALYZE, BUFFERS)` on INSERT policy subquery required in QA gate before merge

The Was? vocabulary search can be shipped independently (no schema change required). The item-level search feature depends on migration 068.
