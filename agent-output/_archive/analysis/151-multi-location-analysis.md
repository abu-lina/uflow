---
ID: 151
Origin: 151
UUID: a3f8c2e7
Status: Active
---

# Analysis 151: Multi-Location Support

## 1. Changelog
| Date | Handoff | Summary |
|------|---------|---------|
| 2026-06-06 | [Analyst/User] | Initial analysis |

## 2. Value Statement & Objective

Restaurants, stores, and community services often operate across multiple physical locations (restaurant chains, franchises, multi-branch stores). Currently UFlow treats each provider as having exactly one location, which forces workarounds like duplicate provider entries or omission of branches.

The objective: allow a single provider record to have multiple locations while maintaining clean search, city filtering, and detail views. Browsing users should immediately see that a provider has multiple branches and be able to explore them.

## 3. Context

UFlow's `providers` table stores address fields directly as columns:

- `address_street` (text)
- `address_zip` (text)
- `address_city` (text)
- `address_country` (text, default 'DE')
- `location_latitude` (numeric)
- `location_longitude` (numeric)
- `opening_hours` (JSONB) — added in migration 078

The project already uses a **1:1 extension table pattern** for listing-type-specific columns (`food_providers`, `store_providers`, `ummah_providers`), each keyed on `provider_id` with CASCADE DELETE.

Key constraints:
- ~1,323 providers across food (973), store (342), and ummah (8) listing types
- German full-text search (tsvector) on `provider_name` and `provider_description`
- City-based filtering is baked into 6+ RPC functions
- Supabase RLS policies control provider visibility
- `opening_hours` is a JSONB column that should logically differ by location

## 4. Methodology

- Source code analysis of all provider-related services, types, UI components, and RPC functions
- Schema analysis of existing `providers` table and extension table patterns
- Identified every location-aware code path that would need changes

## 5. Findings

### 5.1 Current Schema Analysis

The `providers` table (migration 001) stores 7 location-specific columns inline:

| Column | Type | Used In |
|--------|------|---------|
| `address_street` | text | Card, detail, search, navigation |
| `address_zip` | text | Card, detail, navigation |
| `address_city` | text | **Everywhere** — search, filtering, city count, cards, detail |
| `address_country` | text | Detail |
| `location_latitude` | numeric(10,8) | Maps (future) |
| `location_longitude` | numeric(11,8) | Maps (future) |
| `opening_hours` | JSONB | OpenStatusLine, ProviderCard, detail views |

Additionally, `show_address` (boolean) controls address visibility — this could logically differ by location (some branches visible, some not).

**Indexes on address_city**:
- `idx_providers_city` (btree on `address_city`)
- `idx_providers_city_lower_trim_approved` (btree on `lower(trim(address_city))`)
- `idx_providers_city_listing_type` on `(address_city, listing_type)`

### 5.2 Schema Design Options

The cleanest approach is a **`locations` table** with a **1:M relationship** to `providers`:

```
providers (1) ──── (M) locations
```

**Columns to move from `providers` to `locations`**:
- `address_street`
- `address_zip`
- `address_city`
- `address_country`
- `location_latitude`
- `location_longitude`
- `opening_hours` (yes, should be per-location — different branches have different hours)
- `show_address` (per-location visibility)
- A new `location_name` (e.g., "Berlin Mitte", "Hamburg Altstadt")
- A new `is_primary` boolean (default true for the first/main location)
- A new `contact_phone` (overrideable per location) — optional, some providers have a central number

**Columns staying on `providers`**:
- Everything not location-specific: name, description, category, images, contact info (email, website, social), listing_type, review fields, provider_owner_id, etc.
- `contact_phone` could either stay (as default) or migrate — depends on whether branches have different numbers. Recommended: keep on providers as primary, allow override on locations.

### 5.3 Service Layer Impact

**`src/services/providers.ts`** (client-side, 992 lines):
- `Provider` interface (line 15): remove `address_city`, `address_street`, `address_zip`, `address_country`, `location_latitude`, `location_longitude`; add `locations` array
- `SearchResult` interface (line 76): same changes
- `searchProviders()` (line 457): the `req.eq('address_city', location)` filter (line 582) must become a subquery/filter on locations
- `fetchProviderCities()` (line 702): currently queries `providers.address_city` — must join with locations
- `fetchFilteredCities()` (line 794): same issue
- `fetchPopularCities()` (line 749): same
- `transformProviderToSearchResult()` (line 126): maps all address fields
- `getProviderById()` (line 387): needs to join locations and attach default address

**`src/services/providers.server.ts`** (server-side, 265 lines):
- `getProviderById()` (line 23): must join locations table
- `getAllBookmarkedItems()` (line 139): maps address fields
- `fetchBookmarkedCities()` (line 192): reads `providers(address_city)` — must join locations
- `getProviders()` (line 112): currently reads all columns

**`src/services/providerService.ts`** (provider creation, 335 lines):
- `createProviderOrService()` (line 73): inserts address fields directly — must create a `locations` row instead
- The form data schema (`ProviderFormData`) must include a way to submit multiple location addresses, or at minimum accept a primary location on creation with ability to add more later

**Admin services** (`src/services/admin/`):
- `providerEdit.ts`: updates `address_city` directly — must update locations table instead
- `providers.ts`: admin search results include `address_city`
- `communityServiceEdit.ts`: same issue for ummah providers

### 5.4 UI Impact Analysis

**`ProviderCard.tsx`** (line 45-567):
- Lines 140-152: builds address string from individual address fields — must use `locations[0]` (primary location)
- Must show a badge like "2 Standorte" (2 locations) when `locations.length > 1`
- Line 421: `openStatus` uses `opening_hours` from provider — must use primary location's hours

**`ProviderDetailPage.tsx`** (line 44-1065):
- Lines 356-390: address display on mobile — must use primary or selected location
- Multiple places: `formatAddress()`, `isAddressNavigable()`, navigation calls all use address fields
- Must add location switcher/picker when provider has multiple locations

**`ProviderDetailModal.tsx`** (line 52-896):
- Lines 419-461: address display, navigation — same treatment needed
- The right panel shows location details — must support location switching

**`MobileProviderDetail.tsx`** (line 21-196):
- Image-focused header, but still part of detail flow that needs location awareness

**`OpenStatusLine.tsx`** (line 1-55):
- Reads `provider.opening_hours` directly — must read from selected/primary location

**New UI components needed**:
- `LocationBadge` — small pill on cards showing "2 Standorte"
- `LocationSwitcher` — dropdown/list on detail pages to pick a branch
- `LocationDetail` — shows address, hours, contact for selected location

### 5.5 Search Implications

**Critical design decision: Should search return one result per provider or one per location?**

This is the key architectural question.

**Option: One result per provider (recommended)**
- Search returns each provider once, with their primary location's city
- Better UX: no duplicate results, cleaner card display
- City filter matches the primary location's city
- Provider cards can show a "N locations" badge
- Detail page shows all locations
- Pro: simpler migration, less change to search RPCs
- Con: a provider with primary in Berlin but branches in Hamburg won't appear in Hamburg searches

**Option: One result per location**
- A provider in Berlin + Hamburg appears in both city filters
- But cards would show duplicate entries in search results
- City count functions would count each location separately
- Pro: every branch is findable
- Con: card-level deduplication needed, more complex UI

**Recommendation: Primary-location-based search with a "Show all branches" flow**

The search is provider-centric (not location-centric). Keep one-result-per-provider. A provider's search-visible city is `locations[is_primary = true].address_city`. On the detail page, all locations are shown and browsable.

**Affected RPCs and functions**:

| RPC/Function | Change Needed |
|---|---|
| `search_providers` | `city_filter` must filter by locations table, or by provider's primary location |
| `search_providers_enhanced` | Same |
| `get_filtered_category_ids_by_search` | Uses `p.address_city = location_filter` — must join locations |
| `get_filtered_cities_by_search` | Uses `p.address_city` — must use locations |
| `get_cities_with_counts` | Counts `address_city` from providers directly |
| `get_provider_count_by_city` | Same |
| `search_provider_ids_by_name` | Only uses provider_name, unaffected |

### 5.6 Migration Considerations

**Existing data**: All ~1,323 existing providers have address data on the `providers` row.

**Migration strategy**:
1. Create `locations` table
2. Backfill one location per existing provider (the current address data as `is_primary = true`)
3. Keep `providers.address_city` as a **denormalized cache column** for search performance (or drop it and update all RPCs)
4. Update creation flow to insert into `locations`
5. Update all reads to join locations

**Keeping `address_city` as a denormalized column** is recommended for MVP — it avoids touching every RPC immediately. Set it on INSERT/UPDATE of locations via a trigger or application logic. Eventually drop it after all RPCs are migrated.

**Opening hours migration**: Current `providers.opening_hours` JSONB values should be copied to `locations.opening_hours` for the single backfilled location per provider.

## 6. Design Options

### Option A: Separate `locations` Table with Denormalized `address_city` (Recommended)

Create a `locations` table with 1:M to `providers`. Keep `providers.address_city` as a denormalized cache.

**Schema changes**:
- New table `locations` with: `location_id UUID PK`, `provider_id UUID FK NOT NULL`, `location_name TEXT`, `address_street TEXT`, `address_zip TEXT`, `address_city TEXT`, `address_country TEXT DEFAULT 'DE'`, `location_latitude NUMERIC`, `location_longitude NUMERIC`, `opening_hours JSONB`, `show_address BOOLEAN DEFAULT TRUE`, `contact_phone TEXT`, `is_primary BOOLEAN DEFAULT FALSE`, `created_at/updated_at TIMESTAMPTZ`
- Add `idx_locations_provider_id`, `idx_locations_city` indexes
- Keep `providers.address_city` as a denormalized search cache
- Add a trigger or application-level sync to keep `providers.address_city` in sync with primary location

**Service changes**:
- `Provider` type: add `locations: Location[]`, remove individual address fields (or keep as legacy accessors pointing to primary location)
- `searchProviders()`: add JOIN to locations for the `location` filter; fall back to `providers.address_city` for backward compat
- `getProviderById()`: JOIN locations, return as array
- `fetchProviderCities()`: query from locations table or from denormalized column
- `createProviderOrService()`: insert a location row alongside provider
- `providerEdit.ts`: update location rows

**RPC changes**:
- All `address_city` filters can keep using `providers.address_city` (it's synced)
- City count RPCs can keep using the denormalized column
- Migration phase 2: update RPCs to join locations instead

**UI changes**:
- `ProviderCard`: read address from `locations[0]`, show "N Standorte" badge when `locations.length > 1`
- `ProviderDetailPage/Modal`: add location switcher, show per-location hours
- `OpenStatusLine`: accept a location override

**Migration effort**: Medium (3-5 days)
- Schema: 1 day
- Backfill script: 0.5 day
- Service layer: 1.5 days
- UI: 1.5 days
- RPCs (optional phase 2): additional 1-2 days

**Pros**:
- Clean relational design
- Opening hours are per-location (correct)
- Cards show multi-location status
- Can keep existing RPCs working with denormalized column
- Existing provider forms mostly unchanged (they still write to primary location)
- Progressive rollout possible

**Cons**:
- Denormalized column requires sync logic
- Some services still need changes (city filtering, bookmarked cities)
- Extra JOIN for detail page queries

### Option B: JSONB Array of Locations on `providers`

Store all locations as a JSONB array directly on the `providers` row alongside a denormalized `address_city` for search.

**Schema changes**:
- Add `locations JSONB DEFAULT '[]'` column to `providers`
- Each location: `{ id, name, street, zip, city, country, lat, lng, hours, show_address, phone, is_primary }`
- Keep `address_city` as a denormalized column synced via trigger

**Service changes**:
- Parse locations array in all reads
- Write full array on edits
- Very little SQL change (no JOINs needed)

**Migration effort**: Low (2-3 days)
- Schema: 0.5 day
- Service layer: 1 day
- UI: 1 day

**Pros**:
- No JOINs needed — all data in one row
- Fastest reads for detail pages
- Easiest migration (just add column, backfill array)
- Supabase filters work with JSONB operators

**Cons**:
- JSONB is not relational — querying "all providers in Hamburg" requires JSONB path operators or a GIN index
- Supabase client SDK has limited JSONB path querying
- More complex mutations (must read-modify-write the whole array)
- No FK enforcement
- Harder to enforce data integrity
- Supabase's `select` without `->>` doesn't easily filter by JSONB path with the standard JS client

### Option C: Full Migration — `locations` Table, Drop `address_city` from `providers`

Same as Option A but fully migrate — remove `address_city` from `providers` and update all RPCs.

**Schema changes**:
- Same locations table as Option A
- Drop `address_street`, `address_zip`, `address_city`, `address_country`, `location_latitude`, `location_longitude`, `opening_hours`, `show_address` from `providers`

**Service changes**:
- All RPCs must be rewritten to join locations
- Every provider query must join or subquery locations
- `fetchProviderCities()` queries locations table
- `searchProviders()` must filter via locations JOIN

**RPC changes**: All 6+ RPCs need rewrites. Specifically:
- `search_providers`: add `JOIN locations ON ... WHERE locations.city = city_filter`
- `search_providers_enhanced`: same
- `get_filtered_cities_by_search`: query `SELECT DISTINCT city FROM locations`
- `get_cities_with_counts`: count from locations
- `get_provider_count_by_city`: count from locations
- `get_filtered_category_ids_by_search`: join locations

**Migration effort**: High (5-8 days)
- Schema: 0.5 day
- Backfill: 0.5 day
- RPC rewrites: 2-3 days
- Service layer: 1.5 days
- UI: 1.5 days

**Pros**:
- Cleanest design, no denormalization
- Single source of truth
- No sync issues
- Opening hours correctly per-location

**Cons**:
- Touches every RPC — high regression risk
- Every query now requires a JOIN
- More complex migration in a single step
- High effort, blocks other work

## 7. Recommendation

**Option A: Separate `locations` Table with Denormalized `address_city`**

Rationale:
1. The **extension table pattern** (food_providers, store_providers, ummah_providers) already proves the team can execute 1:1/1:M FK patterns with CASCADE DELETE. A `locations` table is a natural extension of this approach.
2. Keeping `providers.address_city` as a denormalized cache means **existing RPCs keep working** without immediate rewrites. This is critical for a phased rollout.
3. `opening_hours` naturally belongs per-location — a JSONB array on providers (Option B) would need duplicated array-level parsing in OpenStatusLine and other components.
4. The denormalized column can be synced via a simple trigger or application-level `syncPrimaryLocation()` helper — low maintenance burden.
5. Progressive migration: deploy schema + backfill first, then update services, then update UI, then eventually update RPCs.

**Implementation order**:
1. Create `locations` table and indexes (migration)
2. Backfill one primary location per existing provider from current address fields
3. Add `providers.address_city` sync trigger (or keep current writes)
4. Update `Provider` and `SearchResult` types with `locations: Location[]`
5. Update `getProviderById()` (client + server) to JOIN locations
6. Update `searchProviders()` to use `providers.address_city` denormalized column
7. Update `fetchProviderCities()`, `fetchFilteredCities()`, `fetchPopularCities()` to use locations table (or denormalized column)
8. Update `ProviderCard` to show primary address + location count badge
9. Update detail views (Page + Modal + Mobile) with location switcher
10. Update provider creation (`providerService.ts`) and editing (admin) to handle locations
11. (Phase 2) Rewrite RPCs to use locations table directly

## 8. Gap Tracking Table

| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| 1 | Should search return one result per provider or per location? | No | Design decision → settled as "one per provider" in this analysis |
| 2 | Should `contact_phone` move to locations or stay on providers? | No | Design decision → keep on providers as default, allow override on locations |
| 3 | How many providers currently have `show_address = false`? | Yes | Run SQL query against prod to understand address visibility patterns |
| 4 | Are there existing RLS policies that filter on `address_city`? | No | Checked: no RLS policies filter on address columns |
| 5 | What does the provider create/edit form look like for multi-location input? | Yes | Need to audit form provider components for multi-address UX design |
| 6 | Should `bookmarks` track providers or specific locations? | No | Bookmarks should stay at provider level (not location-specific) |
| 7 | Does the navigation "Open in Maps" need a location selector? | No | Should use the selected/primary location's coordinates |

## 9. Open Questions

1. **Provider creation UX**: Should the initial provider creation form allow adding multiple locations, or should locations be added later via a "manage locations" page? Recommendation: start with single location on creation, add "Manage Locations" in provider dashboard.

2. **Analytics impact**: City counts in marketing materials and waitlist conversion — should these count providers or locations? Recommendation: keep as provider counts (one business = one count).

3. **URL schema**: Should `/providers/{id}` default to primary location with `?location={locationId}` parameter for specific branches? Recommendation: yes — primary location is the default, query param for specific branch deep-linking.

4. **Pricing/per-location config**: Some offers/prices might differ by location. Should offers become per-location too? Recommendation: not for MVP. Keep offers at provider level. Add if users request it.
