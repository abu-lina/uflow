# Analysis: Provider Edit Page Rebuild — Plan 145

> **Live database schema audit performed 2026-06-05.** Migration files are stale — this document reflects actual Supabase schema.

---

## 1. Live Database Schema (from Supabase introspection)

### 1.1 `providers` table

| Column | Type | Notes |
|--------|------|-------|
| `provider_id` | UUID PK | |
| `provider_name` | TEXT | |
| `provider_description` | TEXT | nullable |
| `provider_images` | JSONB | `{urls: string[]}` |
| `category_id` | UUID FK → categories | |
| `address_street`, `address_zip`, `address_city`, `address_country` | TEXT | all nullable |
| `location_latitude`, `location_longitude` | NUMERIC | nullable |
| `contact_email`, `contact_phone` | TEXT | nullable |
| `social_website`, `social_instagram` | TEXT | nullable |
| `provider_owner_id` | UUID FK | nullable |
| `user_created_id` | UUID | nullable |
| `review_status` | ENUM | `pending/approved/rejected/needs_revision/removed_by_owner` |
| `review_feedback` | TEXT | nullable |
| `show_address` | BOOLEAN | |
| `enrichment_eligible` | BOOLEAN | |
| `last_enriched_at` | TIMESTAMPTZ | nullable |
| `import_source`, `import_source_id`, `import_source_url` | TEXT | all nullable |
| `listing_type` | ENUM | `food/store/ummah` |
| `muslim_owned` | BOOLEAN | |
| `has_prayer_space` | BOOLEAN | |
| `family_friendly` | BOOLEAN | |
| `women_friendly` | BOOLEAN | |
| `children_friendly` | BOOLEAN | |
| `makes_donations` | BOOLEAN | |
| `has_parking` | BOOLEAN | |
| `economic_solidarity` | BOOLEAN | |
| `opening_hours` | JSONB | nullable |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Notable absences (confirmed via live query):**
- **No `offers_ids` or `needs_ids` columns** — these were dropped in a prior migration. The UI still references them but they don't exist. The `provider_offers` and `provider_needs` junction tables are the current pattern.
- **No `halal_level`** — replaced by `verification_method` + `has_certificate` on extension tables.

### 1.2 `food_providers` extension table (1:1, listing_type = 'food')

| Column | Type | Notes |
|--------|------|-------|
| `provider_id` | UUID PK FK | |
| `verification_method` | TEXT | `'online'` or `'onsite'` |
| `has_certificate` | BOOLEAN | Whether halal certificate exists |
| `no_alcohol` | BOOLEAN | |
| `no_pork` | BOOLEAN | |
| `no_gambling` | BOOLEAN | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### 1.3 `store_providers` extension table (1:1, listing_type = 'store')

| Column | Type | Notes |
|--------|------|-------|
| `provider_id` | UUID PK FK | |
| `verification_method` | TEXT | `'online'` or `'onsite'` |
| `has_certificate` | BOOLEAN | |
| `no_gambling` | BOOLEAN | |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### 1.4 `provider_delivery_links` — ⚠️ DOES NOT EXIST IN LIVE DB

The migration file `20260604120000_delivery_platform_links.sql` exists in the repo but was **never applied**. This table needs to be created before the UI can use it.

### 1.5 `enrichment_candidates` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `provider_id` | UUID FK | |
| `source` | TEXT | e.g. `'joinhalal'`, `'wolt'`, `'unsplash'` |
| `source_url` | TEXT | nullable |
| `field_name` | TEXT | e.g. `'provider_images'` |
| `proposed_value` | JSONB | |
| `current_value` | JSONB | |
| `status` | ENUM | `pending/approved/rejected/applied` |
| `enrichment_type` | TEXT | `'data'` or `'image'` |
| `image_url` | TEXT | Supabase Storage URL |
| `source_service` | TEXT | e.g. `'unsplash'` |
| `source_category` | TEXT | |
| `attribution` | JSONB | photo credit info |
| `enriched_at`, `reviewed_at` | TIMESTAMPTZ | |
| `reviewer_id` | UUID FK | nullable |
| `run_id` | UUID | nullable |
| `created_at` | TIMESTAMPTZ | |

### 1.6 No `menu_items` table exists

There is no menu or dishes table in the current schema. This will need to be designed from scratch.

---

## 2. Current ProviderEditForm State

### 2.1 Form Structure

The form has 4 collapsible sections: **Basics**, **Location**, **Contact**, **Media**.

Current `ProviderEditFormData`:
```typescript
{
  providerName, providerDescription, categoryId, listingType,
  street, zipCode, city, country, isOnlineBusiness, showAddress,
  website, instagram, email, phone,
  images,                        // JSON string → {urls: string[]}
  selectedOfferIds,              // ❌ COLUMN DROPPED FROM DB
  selectedNeedIds,               // ❌ COLUMN DROPPED FROM DB
  selectedCommunityServiceIds,
}
```

### 2.2 Sub-pages

| Sub-page | Status | Notes |
|----------|--------|-------|
| `/category` | ✅ Active | |
| `/offers` | ❌ **Deprecated** | Can delete — offers use junction table |
| `/needs` | ❌ **Deprecated** | Can delete — needs use junction table |
| `/images` | ✅ Active | |
| `/social` | ✅ Active | Community services via provider_engagements |

### 2.3 Save Flow

**Admin path** (via `/api/admin/edit-provider` PATCH → `updateProviderFields`):
- Writes to `providers` table: basic fields, contact, address, images
- Writes to `provider_offers`, `provider_needs`, `provider_engagements` (junction tables)
- Does **NOT** write to:
  - `food_providers` / `store_providers` (verification_method, has_certificate, no_alcohol, etc.)
  - `providers.opening_hours`
  - `providers.muslim_owned`, `has_prayer_space`, etc. (amenity booleans)
  - `provider_delivery_links` (table doesn't exist in live DB)

---

## 3. Gap Analysis

### 3.1 Remove Deprecated Offers & Needs
**Live DB confirms:** Columns already dropped. Easy removal from UI.

**Files to change:**
- `ProviderEditForm.tsx`: Remove fields from `ProviderEditFormData`, remove UI rows, remove localStorage sync, remove from save handler
- `page.tsx`: Remove `offersIds`/`needsIds` from request body
- `adminSchemas.ts`: Remove `offersIds`/`needsIds` from schema
- `providerEdit.ts`: Remove junction table writes
- Delete: `offers/page.tsx`, `needs/page.tsx`

### 3.2 Add Menu Section
**No existing table.** Needs new data model.

**Open question:** What is a menu item?
- Option A: Simple text field (provider types their dishes)
- Option B: Structured table (`menu_items` with name, description, price, category, is_available)
- Option C: Repurpose existing offers system with a new `menu` category

### 3.3 Add Halal Check Section
**Live DB has:** `verification_method` ('online'/'onsite') + `has_certificate` on `food_providers` / `store_providers`. No `proof_tier` or `halal_level`.

**User wants:** Bronze/Silver/Gold seal + certificate upload.

**Gap:** The current schema only has 2 tiers (online/onsite) + a boolean certificate flag. No storage for actual certificate files exists. Need a storage bucket and URL column, or rethink the mapping.

### 3.4 Add Order/Delivery Links
**Table doesn't exist in live DB.** Migration must be applied first.

**Data model** (from migration file):
- `provider_delivery_links(provider_id, platform, platform_url, platform_slug, is_active)`

**UI approach:** Full array replacement in PATCH (same pattern as the deprecated offers/needs).

### 3.5 Add Opening Hours
**Column exists** on `providers` table as JSONB.
**Type `OpeningHours`** already defined in `src/types/openingHours.ts`:
```typescript
{ monday?: {open: string, close: string} | null, tuesday?: ..., ...sunday }
```

**Gap:** No UI or API writes.

### 3.6 Add Values & Amenities
**All 8 booleans exist** on `providers` table.
**3 additional booleans** on extension tables (no_alcohol, no_pork for food; no_gambling for store).

**Gap:** No UI, no API writes, no conditional display by listing_type.

### 3.7 Add Enrichment Review
**Component, service, API all exist** — only needs a page to mount them.

---

## 4. Open Questions (need user input)

1. **Menu data model:** Simple text or structured table?
2. **Halal check:** 3-tier (bronze/silver/gold) or existing 2-tier (online/onsite) + certificate boolean?
3. **Certificate upload:** Need storage bucket for actual files?
4. **Delivery links:** Need migration to be run first
5. **menu_items table:** Does it need a migration to create?
6. **Enrichment review:** Standalone page, per-provider in edit, or both?

---

## 5. Affected Files Summary

| File | Change | 
|------|--------|
| `src/components/providers/ProviderEditForm.tsx` | Major rewrite — remove offers/needs, add 6 new sections |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Add new fields to request body |
| `src/lib/validations/adminSchemas.ts` | Add new fields to schema |
| `src/services/admin/providerEdit.ts` | Add writes for all new tables/columns |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/offers/page.tsx` | DELETE |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/needs/page.tsx` | DELETE |
| NEW: `.../edit/menu/page.tsx` | Menu sub-page |
| NEW: `.../edit/delivery/page.tsx` | Delivery links sub-page |
| NEW: `.../edit/hours/page.tsx` | Opening hours sub-page |
| NEW: `.../edit/values/page.tsx` | Values & amenities sub-page |
| NEW: `.../edit/enrichment/page.tsx` | Enrichment per-provider sub-page |
| NEW: `src/app/(dashboard)/dashboard/enrichment/page.tsx` | Enrichment overview page |
| NEW: `supabase/migrations/094_plan_145_provider_edit_page.sql` | Create provider_delivery_links + menu_items (if needed) |
