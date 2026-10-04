---
ID: 151
Origin: 151
UUID: b3f1a9d4
Status: Active
---

# Plan 151: Multi-Location Support

## Changelog
| Date | Handoff | Summary |
|------|---------|---------|
| 2026-06-06 | Planner | Initial implementation plan |
| 2026-06-06 | Architect | APPROVED_WITH_CHANGES — applied fixes: unique constraint, sync trigger, city query fix, URL params, upsert pattern, N+1 fix, idempotent backfill, Haversine callout |

## Value Statement

Restaurants, stores, and community services with multiple branches (chains, franchises) currently can't represent that on UFlow. This forces duplicate provider entries or omission of branches. Multi-location support lets a single provider record have multiple physical locations with per-branch opening hours, while keeping search provider-centric (one result per business).

## Scope

### In Scope

- New `locations` table with 1:M FK to `providers` (CASCADE DELETE)
- Partial unique index to enforce exactly one primary location per provider
- Postgres trigger to sync `providers.address_city` from primary location
- Backfill migration: one location per existing provider from current address fields (idempotent)
- Type changes: `Location` interface, `locations: Location[]` on `Provider`
- Service layer: all provider queries JOIN locations
- Keep `providers.address_city` as denormalized cache for RPC compatibility (Phase 1)
- City queries (`fetchProviderCities`, `fetchPopularCities`, `fetchFilteredCities`) continue reading from denormalized `providers.address_city` in Phase 1
- Provider card: address from primary location, "N Standorte" badge
- Detail pages (Page/Modal/Mobile): location switcher section showing all branches, with `?location=` URL param for deep-linking
- `OpenStatusLine`: read from primary or selected location's hours
- Provider creation: also insert one location row
- Admin provider edit: upsert locations (preserve existing IDs)

### Out of Scope (Phase 2)

- RPC rewrites to use locations table directly (keep using denormalized `address_city`)
- Per-location offers/pricing
- Per-location bookmarks
- "Manage Locations" dashboard UI for providers (post-creation location management)
- Geocoding integration for new location entries

## Implementation Order

---

### Milestone 1: Database Schema & Backfill

**Migration file**: `supabase/migrations/101_plan_151_multi_location.sql`

**Steps:**

1. Create `locations` table:

```sql
CREATE TABLE public.locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  location_name TEXT,
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'DE',
  location_latitude NUMERIC(10,8),
  location_longitude NUMERIC(11,8),
  opening_hours JSONB,
  show_address BOOLEAN DEFAULT TRUE,
  contact_phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

2. Add indexes:
   - `idx_locations_provider_id` on `provider_id`
   - `idx_locations_city` on `address_city`

3. **Critical: Add partial unique index to enforce one primary per provider:**
```sql
CREATE UNIQUE INDEX idx_locations_unique_primary
  ON public.locations (provider_id)
  WHERE is_primary = TRUE;
```

4. Enable RLS on locations, add policies:
   - SELECT: public (all authenticated/anonymous users)
   - INSERT/UPDATE/DELETE: provider owners + service_role

5. **Add trigger to sync `providers.address_city` from primary location:**
```sql
CREATE OR REPLACE FUNCTION sync_primary_location_city()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- If the deleted location was primary, try to assign another
    IF OLD.is_primary THEN
      UPDATE providers p SET address_city = (
        SELECT l.address_city FROM locations l
        WHERE l.provider_id = OLD.provider_id AND l.is_primary = TRUE
        LIMIT 1
      ) WHERE p.provider_id = OLD.provider_id;
    END IF;
    RETURN OLD;
  ELSE
    UPDATE providers p SET address_city = NEW.address_city
    WHERE p.provider_id = NEW.provider_id AND NEW.is_primary = TRUE;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_primary_city
  AFTER INSERT OR UPDATE OR DELETE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION sync_primary_location_city();
```

6. **Idempotent backfill** — wrapped in transaction:
```sql
BEGIN;
INSERT INTO public.locations (
  provider_id, location_name, address_street, address_zip, address_city,
  address_country, location_latitude, location_longitude, opening_hours,
  show_address, contact_phone, is_primary
)
SELECT
  provider_id, NULL, address_street, address_zip, address_city,
  address_country, location_latitude, location_longitude, opening_hours,
  show_address, contact_phone, TRUE
FROM public.providers
WHERE NOT EXISTS (
  SELECT 1 FROM public.locations WHERE locations.provider_id = providers.provider_id
);
COMMIT;
```

---

### Milestone 2: Types

**Files**:
- `src/types/location.ts` (new)
- `src/services/providers.ts` (modify Provider, SearchResult interfaces)
- `src/types/adminProvider.ts` (modify AdminProviderWithExtensions)

**Steps:**

1. Create `src/types/location.ts`:

```typescript
import type { OpeningHours } from '@/types/openingHours';

export interface Location {
  location_id: string;
  provider_id: string;
  location_name: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  opening_hours: OpeningHours | null;
  show_address: boolean;
  contact_phone: string | null;
  is_primary: boolean;
  created_at: string | null;
  updated_at: string | null;
}
```

2. Add `locations: Location[]` to `Provider` interface in `providers.ts`. Keep legacy address fields for backward compat during migration.

3. Add `locations: Location[]` to `SearchResult` interface.

4. Add `locations` to `AdminProviderWithExtensions` in `adminProvider.ts`.

---

### Milestone 3: Service Layer — Client-side (`providers.ts`)

**Files**:
- `src/services/providers.ts`

**Steps:**

1. `getProviderById()` (line 387): Use Supabase's `locations(*)` in the same select query to avoid N+1:
```typescript
const { data } = await supabase
  .from('providers')
  .select('*, category:categories(...), locations(*)')
  .eq('provider_id', id)
  .maybeSingle();
```

2. `searchProviders()` (line 457): The `req.eq('address_city', location)` filter at line 582 stays as-is (uses denormalized `providers.address_city` for Phase 1).

3. `transformProviderToSearchResult()` (line 126): Keep mapping individual address fields from provider (they still exist on the denormalized row). Add `locations` passthrough.

4. **City queries stay on denormalized column** — `fetchProviderCities()`, `fetchPopularCities()`, `fetchFilteredCities()` continue reading from `providers.address_city` in Phase 1. Querying from `locations` would show a provider with branches in 5 cities in all 5 filters, violating the "one result per provider" model.

5. `getProviders()` (line 343): Add optional `includeLocations` param to skip JOIN when not needed.

6. `getAllBookmarkedItems()` (line 920): Map locations from the nested provider query.

7. `fetchBookmarkedCities()` (line 981): Continue reading from denormalized `providers.address_city`.

---

### Milestone 4: Service Layer — Server-side (`providers.server.ts`)

**Files**:
- `src/services/providers.server.ts`

**Steps:**

1. `getProviderById()` (line 23): Same N+1 fix — use `locations(*)` in the select.

2. `getAllBookmarkedItems()` (line 139): Attach locations to the results.

3. `fetchBookmarkedCities()` (line 192): Continue reading from denormalized column.

4. `getProviders()` (line 112): Add optional `includeLocations` to skip JOIN when not needed.

---

### Milestone 5: Provider Creation (`providerService.ts`)

**Files**:
- `src/services/providerService.ts`
- `src/types/provider.ts`

**Steps:**

1. In `createProviderOrService()`, after the provider INSERT succeeds, also INSERT one location row using the same address fields from `formData`. Set `is_primary = TRUE`.

2. Keep the address fields on `providers` insert for the denormalized column. The trigger will sync `address_city` automatically.

---

### Milestone 6: Admin Provider Edit (`admin/` services)

**Files**:
- `src/services/admin/providerEdit.ts`
- `src/services/admin/providers.ts`
- `supabase/migrations/094_plan_145_provider_edit_page.sql` (admin_update_provider RPC)

**Steps:**

1. Extend `AdminProviderEditData` with a `locations` field (array of location objects).

2. Extend `buildRpcPayload()` to include a `locations` key in the JSONB payload.

3. **Use upsert pattern** (NOT delete-and-reinsert) for locations in the `admin_update_provider` RPC:
   - Parse each location's `location_id`; if present, UPDATE it; if absent (new), INSERT it
   - Locations in the DB but not in the payload get DELETEd
   - This preserves `location_id` values for existing locations and is idempotent
   - Sync `providers.address_city` from the primary location after update (trigger handles this)

4. Update `getProviderForAdmin()` to left-join `locations`.

---

### Milestone 7: UI — ProviderCard

**Files**:
- `src/components/providers/ProviderCard.tsx`

**Steps:**

1. Accept `locations: Location[]` prop (from Provider interface). Read address from `locations[0]` instead of individual address props.

2. Add "2 Standorte" badge when `locations.length > 1`. Use a small pill component similar to the existing category badge.

3. `OpenStatusLine` receives `provider` — ensure it reads from primary location's hours (or keep as-is since provider.opening_hours is the denormalized primary).

---

### Milestone 8: UI — Detail Pages

**Files**:
- `src/components/providers/ProviderDetailPage.tsx`
- `src/components/providers/ProviderDetailModal.tsx`
- `src/components/providers/MobileProviderDetail.tsx`

**Steps:**

1. All three detail views: Add a "Locations" section showing all branches as cards (mirroring the menu/offers section pattern).

2. Each location card shows: location name, address, opening hours, phone (if different), "Navigate" / "Open in Maps" button.

3. Current/selected location highlighted (default = primary location with `is_primary = TRUE`).

4. Clicking a different location switches the displayed address, hours, and navigation link.

5. **Use `useSearchParams` for location state** — read `?location=` on mount, update URL on switch:
   - Default to primary location when `?location=` is absent
   - Enables deep-linking to specific branches
   - Survives page refresh and browser back/forward

6. Pass `selectedLocationId` to `OpenStatusLine` so it reads the correct location's hours.

---

### Milestone 9: UI — New Components

**Files**:
- `src/features/providers/components/LocationCard.tsx` (new)
- `src/features/providers/components/LocationBadge.tsx` (new)

**Steps:**

1. `LocationCard`: Reusable card showing one location's details — name, full address, hours, phone override, maps link.

2. `LocationBadge`: Small pill reading "N Standorte" for ProviderCard, linking to detail page.

---

### Milestone 10: OpenStatusLine Update

**Files**:
- `src/features/providers/components/OpenStatusLine.tsx`

**Steps:**

1. Accept optional `locationId` prop. When provided, read `opening_hours` from the matching location instead of `provider.opening_hours`.

---

## Migration Strategy

### Phase 1 (This Plan)

1. Run migration `101_plan_151_multi_location.sql` — creates `locations` table, indexes, partial unique constraint, sync trigger, RLS, and idempotent backfill.
2. Deploy all code changes simultaneously: types, services, UI components.
3. Existing `providers.address_city` remains as a denormalized cache — all RPCs continue working unchanged.
4. The trigger keeps `providers.address_city` in sync with the primary location automatically.
5. City queries (`fetchProviderCities`, `fetchPopularCities`, `fetchFilteredCities`) stay on the denormalized column.

### Phase 2 (Future — RPC Migration)

1. Rewrite all RPCs to JOIN `locations` instead of reading `providers.address_city`:
   - `search_providers`, `search_providers_enhanced`
   - `get_filtered_cities_by_search`, `get_filtered_category_ids_by_search`
   - `get_cities_with_counts`, `get_provider_count_by_city`
   - **`find_nearby_food_providers`** — reads `p.location_latitude`/`longitude`; rewrite to JOIN locations
2. Drop legacy address columns from `providers` table.
3. Update city queries to read from `locations` directly.

## Rollback Plan

1. **Schema**: `DROP TABLE IF EXISTS public.locations CASCADE;` — reverts table, indexes, trigger
2. **Backfill**: No data loss — providers still have their original address columns
3. **Code**: Revert all changes to types, services, and components. The denormalized `address_city` on providers means existing code still works
4. No data migration needed for rollback — the `providers` row still has all address data

## Test Strategy

### Schema & Migration Tests
- Migration creates locations table with correct columns, types, defaults
- Partial unique index prevents two primary locations per provider
- Location INSERT works, FK to providers enforces CASCADE DELETE
- Backfill creates one location per existing provider with matching data (idempotent on re-run)
- Trigger properly syncs `providers.address_city` when:
  - Primary location city changes
  - New location inserted with `is_primary = TRUE`
  - Primary location deleted (falls back to another)
- RLS policies allow public SELECT, restrict write to owner/service_role

### Service Layer Tests
- `getProviderById` returns provider with `locations` array (no N+1)
- `searchProviders` with city filter still works (uses denormalized column)
- `fetchProviderCities` returns cities from denormalized column (primary, not all locations)
- `fetchPopularCities` returns correct counts
- `createProviderOrService` also inserts a location row
- Admin `updateProviderFields` handles locations via upsert (preserves IDs)

### Component Tests
- `ProviderCard` shows primary location address, shows "2 Standorte" badge when applicable
- `ProviderDetailPage` shows locations section, switching location updates displayed data, URL param updates
- `ProviderDetailModal` same behavior
- `OpenStatusLine` reads correct location's hours
- `LocationBadge` renders correct count
- Location state survives page refresh (via `?location=` URL param)

### Integration Tests
- Full flow: create provider → backfill location → view card → see badge → open detail → switch location → verify hours update → refresh page → verify location persists

## Effort Estimate

| Milestone | Description | Estimated Time |
|-----------|-------------|----------------|
| M1 | Schema + backfill migration (with trigger, constraint) | 1 day |
| M2 | Type changes | 0.25 day |
| M3 | Client service layer | 1 day |
| M4 | Server service layer | 0.5 day |
| M5 | Provider creation | 0.5 day |
| M6 | Admin edit (upsert pattern) | 0.5 day |
| M7 | ProviderCard changes | 0.5 day |
| M8 | Detail pages (3 variants + URL params) | 1.5 days |
| M9 | New components | 0.5 day |
| M10 | OpenStatusLine | 0.25 day |
| **Total** | | **6.5 days** |

## Dependencies

- Migration numbering: last migration is `100_plan_150_category_redesign.sql`, next is `101`
- Types must be done before service layer
- Service layer must be done before UI
- Schema migration is independent (can run first)
- Provider creation and admin edit can be done in parallel with UI work
