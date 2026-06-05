# Plan 145: Provider Edit Page Rebuild — Implementation Plan

> **Date**: 2026-06-05
> **Status**: Draft
> **Depends on**: Analysis at `agent-output/analysis/145-provider-edit-page-analysis.md`

---

## 1. Plan Overview

Rebuild the admin provider edit page to replace the deprecated offers/needs sections with 6 new sections: Menu, Halal Check, Certificate Upload, Delivery Links, Opening Hours, Values & Amenities, and Enrichment Review.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Menu table | Reuse existing `food_menu` (formerly `provider_menu_items`), add `category` column | Table already has name_de, name_en, description_de, price_cents, is_available, sort_order. Avoids unnecessary new table. |
| Halal tiers | Bronze = `verification_method='online'`, Silver = `verification_method='onsite'`, Gold = `has_certificate=true` | Maps directly to existing columns on `food_providers`/`store_providers`. No schema change needed for verification. |
| Certificate upload | Add `certificate_url` TEXT to `food_providers` + `store_providers` + storage bucket | Enables file upload for Gold tier certification. |
| Delivery links | Apply existing migration `20260604120000_delivery_platform_links.sql` | Table doesn't exist in live DB yet. |
| Opening hours | Write to existing `providers.opening_hours` JSONB | Column already exists. No schema change. |
| Values & amenities | Write `providers.*` booleans + extension table booleans (`food_providers`/`store_providers`) | Columns exist. Scope by `listing_type`. |
| Enrichment review | Standalone page at `/dashboard/enrichment` + per-provider sub-page at `.../edit/enrichment` | Component, service, API all exist — only need pages to mount them. |

### Data Flow

```
Sub-page (e.g. /edit/menu)
  → localStorage write (visibilitychange syncs back to ProviderEditForm)
  → ProviderEditForm reads from localStorage
  → PATCH /api/admin/edit-provider
  → providerEditUpdateSchema validates (Zod)
  → updateProviderFields() writes to:
      - providers table (basic fields, address, contact, images, booleans, opening_hours)
      - food_providers / store_providers (verification_method, has_certificate, certificate_url, no_alcohol, no_pork, no_gambling)
      - provider_delivery_links (array replacement)
      - food_menu (array replacement of menu items)
      - provider_engagements (community services, unchanged)
```

---

## 2. Migration Plan

### Order of Migrations

1. **20260604120000_delivery_platform_links.sql** — Apply existing (never applied) migration
2. **094_plan_145_provider_edit_page.sql** — New migration: `certificate_url`, `food_menu.category`, RLS policies, storage bucket

### Migration SQL

See Section 11 for the complete SQL.

---

## 3. Milestone 1: DB Migrations

### 3.1 Apply existing delivery_platform_links migration

Run `supabase/migrations/20260604120000_delivery_platform_links.sql` against live DB. This creates `provider_delivery_links` with columns: provider_id, platform, platform_url, platform_slug, is_active, last_verified_at, created_at, updated_at.

### 3.2 New migration: `094_plan_145_provider_edit_page.sql`

**Changes:**

1. **Add `category` column to `food_menu`**
   ```sql
   ALTER TABLE public.food_menu ADD COLUMN IF NOT EXISTS category TEXT;
   ```

2. **Add `certificate_url` to `food_providers`**
   ```sql
   ALTER TABLE public.food_providers ADD COLUMN IF NOT EXISTS certificate_url TEXT;
   ```

3. **Add `certificate_url` to `store_providers`**
   ```sql
   ALTER TABLE public.store_providers ADD COLUMN IF NOT EXISTS certificate_url TEXT;
   ```

4. **Create storage bucket** `provider-certificates`
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES ('provider-certificates', 'provider-certificates', true)
   ON CONFLICT (id) DO NOTHING;
   ```
   Plus RLS policies for the bucket:
   - Public SELECT for reading certificate files
   - Service role ALL for admin uploads
   - Authenticated users INSERT with owner check

5. **Add RLS policies for `food_menu`** (if not already existing):
   - Public SELECT
   - Service role ALL
   - Authenticated INSERT/UPDATE/DELETE with owner check

### 3.3 `AdminProviderEditData` extended

New fields in the service interface:

```typescript
export interface AdminProviderEditData {
  // ...existing fields...
  
  // New fields
  menuItems?: MenuItemInput[];
  halalVerification?: HalalVerificationInput;
  certificateUrl?: string | null;
  deliveryLinks?: DeliveryLinkInput[];
  openingHours?: OpeningHours | null;
  // Values & Amenities (providers table)
  muslimOwned?: boolean;
  hasPrayerSpace?: boolean;
  familyFriendly?: boolean;
  womenFriendly?: boolean;
  childrenFriendly?: boolean;
  makesDonations?: boolean;
  hasParking?: boolean;
  economicSolidarity?: boolean;
  // Extension table booleans (food_providers)
  noAlcohol?: boolean;
  noPork?: boolean;
  // Extension table booleans (store_providers)
  noGambling?: boolean;
}

interface MenuItemInput {
  id?: string;  // undefined = new item
  nameDe: string;
  nameEn?: string | null;
  descriptionDe?: string | null;
  priceCents?: number | null;
  category?: string | null;
  sortOrder?: number;
  isAvailable?: boolean;
}

interface DeliveryLinkInput {
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platformUrl: string;
  platformSlug?: string | null;
  isActive?: boolean;
}

interface HalalVerificationInput {
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
}
```

---

## 4. Milestone 2: Admin API Extension

### 4.1 Zod Schema: `providerEditUpdateSchema`

Add new optional fields to `src/lib/validations/adminSchemas.ts`:

```typescript
// New fields for providerEditUpdateSchema
menuItems: z.array(z.object({
  id: z.string().uuid().optional(),
  nameDe: z.string().min(1).max(200),
  nameEn: z.string().max(200).nullable().optional(),
  descriptionDe: z.string().max(1000).nullable().optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
})).optional(),

deliveryLinks: z.array(z.object({
  platform: z.enum(['wolt', 'lieferando', 'ubereats']),
  platformUrl: z.string().url().max(2000),
  platformSlug: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
})).optional(),

openingHours: z.object({
  monday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  tuesday: z.object({ open: z.string(), close: z.string() }).nullable().optional(),
  // ... through sunday
}).nullable().optional(),

verificationMethod: z.enum(['online', 'onsite']).nullable().optional(),
hasCertificate: z.boolean().optional(),
certificateUrl: z.string().url().max(2000).nullable().optional(),

// Values & Amenities
muslimOwned: z.boolean().optional(),
hasPrayerSpace: z.boolean().optional(),
familyFriendly: z.boolean().optional(),
womenFriendly: z.boolean().optional(),
childrenFriendly: z.boolean().optional(),
makesDonations: z.boolean().optional(),
hasParking: z.boolean().optional(),
economicSolidarity: z.boolean().optional(),
noAlcohol: z.boolean().optional(),
noPork: z.boolean().optional(),
noGambling: z.boolean().optional(),
```

Remove deprecated fields:
```typescript
// REMOVE from providerEditUpdateSchema
offersIds: z.array(z.string().uuid()).optional(),
needsIds: z.array(z.string().uuid()).optional(),
```

Also remove from `communityServiceEditUpdateSchema`:
```typescript
// REMOVE from communityServiceEditUpdateSchema
offersIds: z.array(z.string().uuid()).optional(),
needsIds: z.array(z.string().uuid()).optional(),
```

### 4.2 Service Layer: `updateProviderFields`

In `src/services/admin/providerEdit.ts`, add writes for:

1. **menuItems**: Delete all existing menu items for provider, insert new array
2. **deliveryLinks**: Delete all existing delivery links for provider, insert new array
3. **openingHours**: Write directly to `providers` update payload
4. **Values booleans**: Write to `providers` update payload
5. **Extension table booleans**: Upsert into `food_providers` or `store_providers` depending on `listing_type`
6. **verificationMethod/hasCertificate**: Upsert into `food_providers` or `store_providers`
7. **certificateUrl**: Upsert into `food_providers` or `store_providers`
8. **Remove** offersIds/needsIds writes (junction tables)

### 4.3 API Route: `PATCH /api/admin/edit-provider`

No structural changes needed — it already passes validated data to `updateProviderFields`. The extended schema and service handle all new fields.

### 4.4 Certificate Upload API

New endpoint `POST /api/admin/upload-certificate`:

- Accepts FormData with file + providerId + listingType
- Validates file type (PDF, image) and size (max 5MB)
- Uploads to `provider-certificates` bucket at path `{providerId}/{uuid}-{filename}`
- Returns signed URL or public URL
- Client stores the URL and sends it in the next PATCH as `certificateUrl`

---

## 5. Milestone 3: Form Data Types

### 5.1 Extended `ProviderEditFormData`

In `src/components/providers/ProviderEditForm.tsx`, extend the interface:

```typescript
export interface ProviderEditFormData {
  // ...existing fields...
  
  // REMOVE
  // selectedOfferIds: string[];
  // selectedNeedIds: string[];
  
  // NEW
  menuItems: MenuItemFormData[];
  deliveryLinks: DeliveryLinkFormData[];
  openingHours: OpeningHours | null;
  
  // Halal
  verificationMethod: string | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
  
  // Values & Amenities — providers table
  muslimOwned: boolean;
  hasPrayerSpace: boolean;
  familyFriendly: boolean;
  womenFriendly: boolean;
  childrenFriendly: boolean;
  makesDonations: boolean;
  hasParking: boolean;
  economicSolidarity: boolean;
  
  // Extension table booleans
  noAlcohol: boolean;
  noPork: boolean;
  noGambling: boolean;
}

interface MenuItemFormData {
  id?: string;
  nameDe: string;
  nameEn?: string;
  descriptionDe?: string;
  priceCents?: number;
  category?: string;
  sortOrder: number;
  isAvailable: boolean;
}

interface DeliveryLinkFormData {
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platformUrl: string;
  platformSlug?: string;
  isActive: boolean;
}
```

### 5.2 Initial state from provider

Initialize new fields from provider (DB → form):

```typescript
// In the useState initialization:
menuItems: [],  // fetched separately or from provider.food_menu
deliveryLinks: [],  // fetched separately
openingHours: provider.opening_hours || null,
verificationMethod: provider.verification_method || null,
hasCertificate: provider.has_certificate || false,
certificateUrl: (provider as any).certificate_url || null,
muslimOwned: provider.muslim_owned || false,
hasPrayerSpace: provider.has_prayer_space || false,
// ... etc for all booleans
noAlcohol: (provider as any).no_alcohol || false,
noPork: (provider as any).no_pork || false,
noGambling: (provider as any).no_gambling || false,
```

### 5.3 Load delivery links and menu items on mount

```typescript
useEffect(() => {
  async function loadMenuItems() {
    const { data } = await supabase
      .from('food_menu')
      .select('*')
      .eq('provider_id', providerId)
      .order('sort_order');
    if (data) setFormData(prev => ({ ...prev, menuItems: data }));
  }
  async function loadDeliveryLinks() {
    const { data } = await supabase
      .from('provider_delivery_links')
      .select('*')
      .eq('provider_id', providerId);
    if (data) setFormData(prev => ({ ...prev, deliveryLinks: data }));
  }
  if (provider.listing_type === 'food') loadMenuItems();
  loadDeliveryLinks();
}, [providerId, provider.listing_type]);
```

---

## 6. Milestone 4: Remove Deprecated Sections

### 6.1 Delete sub-pages

```
DELETE: src/app/(dashboard)/dashboard/providers/[id]/edit/offers/page.tsx
DELETE: src/app/(dashboard)/dashboard/providers/[id]/edit/needs/page.tsx
```

### 6.2 Remove from `ProviderEditForm.tsx`

1. **Remove from interface**: `selectedOfferIds`, `selectedNeedIds`
2. **Remove from initial state**: lines referencing `provider.offers_ids`, `provider.needs_ids`
3. **Remove from `syncFromLocalStorage`**: localStorage reads for `edit_offers_*` and `edit_needs_*`
4. **Remove UI rows**: the Offers and Needs clickable rows in the Basics section
5. **Remove from `handleSubmit`**: the `offers_ids`, `needs_ids` from Supabase update payload

### 6.3 Remove from admin page `page.tsx`

1. **Remove from `saveProviderEdits`**: `offersIds`, `needsIds` from requestBody

### 6.4 Remove from schema and service

1. **`adminSchemas.ts`**: Remove `offersIds`, `needsIds` from `providerEditUpdateSchema` and `communityServiceEditUpdateSchema`
2. **`providerEdit.ts`**: Remove `offersIds`, `needsIds` from `AdminProviderEditData` interface and from `updateProviderFields` function (the junction table delete/insert blocks)
3. **`ProviderEditFormData`**: Remove `selectedOfferIds`, `selectedNeedIds`

---

## 7. Milestone 5: New Sub-Pages

All sub-pages follow the existing pattern seen in `category/page.tsx`, `images/page.tsx`, and `social/page.tsx`:
- `'use client'`
- Page layout with header (back button + title), scrollable main content, FooterAction
- Read from localStorage on mount (fallback to DB query)
- Write to localStorage on change
- `visibilitychange` event syncs back to parent form

### 7.1 Menu Sub-Page: `.../edit/menu/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/menu`
**Visibility**: Only when `listing_type === 'food'`

**UI**:
- List of current menu items with inline editing (name, description, price, category)
- Add new item button
- Drag handle or sort-order inputs for reordering
- Toggle `is_available` per item
- Save button in FooterAction writes to localStorage key: `admin_edit_menu_{providerId}`

**Data shape** (localStorage):
```typescript
MenuItemFormData[] = Array<{
  id?: string;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  priceCents: number | null;
  category: string;
  sortOrder: number;
  isAvailable: boolean;
}>
```

**DB load on mount**: `SELECT * FROM food_menu WHERE provider_id = ? ORDER BY sort_order`

### 7.2 Halal Check Sub-Page: `.../edit/halal/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/halal`
**Visibility**: Always (but fields differ by `listing_type`)

**UI**:
- 3-tier visual selector (Bronze/Silver/Gold) — mutually exclusive:
  - **Bronze**: `verification_method='online'`, `has_certificate=false`
  - **Silver**: `verification_method='onsite'`, `has_certificate=false`
  - **Gold**: `verification_method='onsite'`, `has_certificate=true`
- If Gold selected: show certificate upload button
- Conditional display based on `listing_type` (`no_alcohol`, `no_pork` for food; `no_gambling` for store)
- Save to localStorage key: `admin_edit_halal_{providerId}`

**Data shape**:
```typescript
{
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
  noAlcohol?: boolean;
  noPork?: boolean;
  noGambling?: boolean;
}
```

**Certificate upload**:
- File picker button
- Uploads via `POST /api/admin/upload-certificate`
- Shows preview of uploaded file
- Stores returned URL in localStorage
- Also shows current certificate_url if exists

### 7.3 Delivery Links Sub-Page: `.../edit/delivery/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/delivery`

**UI**:
- List of current delivery links with inline editing
- Platform selector (wolt/lieferando/ubereats) + URL input + optional slug
- Add/remove rows
- `is_active` toggle per link
- FooterAction saves to localStorage key: `admin_edit_delivery_{providerId}`

**Data shape**:
```typescript
DeliveryLinkFormData[] = Array<{
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platformUrl: string;
  platformSlug?: string;
  isActive: boolean;
}>
```

**DB load on mount**: `SELECT * FROM provider_delivery_links WHERE provider_id = ?`

### 7.4 Opening Hours Sub-Page: `.../edit/hours/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/hours`

**UI**:
- 7-day editor with consistent row layout
- Each day: day name, toggle (closed/open), time inputs (open/close)
- Copy times from previous day button
- "Closed all day" toggle per day (null vs {open, close})
- FooterAction saves to localStorage key: `admin_edit_hours_{providerId}`

**Data shape**: `OpeningHours` from `src/types/openingHours.ts`

**DB load on mount**: `SELECT opening_hours FROM providers WHERE provider_id = ?`

### 7.5 Values & Amenities Sub-Page: `.../edit/values/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/values`

**UI**:
- Toggle switches for each boolean, grouped by category

**Group 1 — Values** (all listing_types):
- `muslim_owned`
- `makes_donations`
- `economic_solidarity`

**Group 2 — Amenities** (all listing_types):
- `has_prayer_space`
- `family_friendly`
- `women_friendly`
- `children_friendly`
- `has_parking`

**Group 3 — Food-specific** (only if `listing_type === 'food'`):
- `no_alcohol`
- `no_pork`

**Group 4 — Store-specific** (only if `listing_type === 'store'`):
- `no_gambling`

- FooterAction saves to localStorage key: `admin_edit_values_{providerId}`

**Data shape**:
```typescript
{
  muslimOwned: boolean;
  hasPrayerSpace: boolean;
  familyFriendly: boolean;
  womenFriendly: boolean;
  childrenFriendly: boolean;
  makesDonations: boolean;
  hasParking: boolean;
  economicSolidarity: boolean;
  noAlcohol?: boolean;
  noPork?: boolean;
  noGambling?: boolean;
}
```

### 7.6 Enrichment Sub-Page: `.../edit/enrichment/page.tsx`

**Route**: `/dashboard/providers/[id]/edit/enrichment`

**UI**:
- Embeds the existing `EnrichmentReviewPanel` component, filtered to this provider
- Adds `providerId` filter via the existing `GET /api/admin/enrichment/candidates?providerId=...`
- Compact version: only shows candidates for this provider, not all providers
- FooterAction with "Back to Edit" button

Since `EnrichmentReviewPanel` already supports `fetchCandidates` with `offset`, the per-provider filtering is done via the API's `providerId` query param. The component doesn't directly accept a `providerId` prop, so refactor it to accept one, or create a wrapper:

```typescript
export function ProviderEnrichmentPanel({ providerId }: { providerId: string }) {
  // Wraps EnrichmentReviewPanel but always supplies providerId filter
}
```

Alternatively, refactor `EnrichmentReviewPanel` to accept an optional `providerId` prop, and when provided, only fetches candidates for that provider.

**Preferred approach**: Add optional `providerId` prop to `EnrichmentReviewPanel`:

```typescript
interface EnrichmentReviewPanelProps {
  providerId?: string; // When set, filters candidates to this provider
}
```

Modify `fetchCandidates` to pass `providerId` to the API.

---

## 8. Milestone 6: Enrichment Review Pages

### 8.1 Standalone Enrichment Overview Page

**Route**: `/dashboard/enrichment`

**File**: `src/app/(dashboard)/dashboard/enrichment/page.tsx`

**UI**:
- Full-page wrapper with header
- Embeds existing `EnrichmentReviewPanel` (unfiltered — shows all pending candidates)
- Accessible only to admins/moderators (check in a layout or middleware)

```tsx
export default function EnrichmentPage() {
  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Enrichment Review" variant="back-and-title" onBack="/dashboard" />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <EnrichmentReviewPanel />
      </main>
    </div>
  );
}
```

**Add to admin navigation**: Link from admin dashboard sidebar/main menu.

### 8.2 Per-Provider Enrichment Sub-Page

**Route**: `/dashboard/providers/[id]/edit/enrichment`

Already covered in Milestone 5 (section 7.6). This is the same component but filtered to a single provider.

---

## 9. Milestone 7: Integration

### 9.1 Wire sub-pages into `ProviderEditForm.tsx`

Add new section buttons in the form UI under appropriate existing sections or as a new section:

**New Section: "Provider Details"** (between Basics and Location):
- Menu row (only when `listing_type === 'food'`) → `/menu`
- Halal Check row → `/halal`
- Delivery Links row → `/delivery`

**New Section: "Operations"** (after Contact):
- Opening Hours row → `/hours`
- Values & Amenities row → `/values`
- Enrichment Review row → `/enrichment`

### 9.2 Sync new data from localStorage

Extend `syncFromLocalStorage` in `ProviderEditForm.tsx`:

```typescript
const storedMenu = localStorage.getItem(`${pfx}edit_menu_${pid}`);
if (storedMenu) {
  const parsed = JSON.parse(storedMenu);
  setFormData(prev => ({ ...prev, menuItems: parsed }));
}

const storedDelivery = localStorage.getItem(`${pfx}edit_delivery_${pid}`);
if (storedDelivery) {
  const parsed = JSON.parse(storedDelivery);
  setFormData(prev => ({ ...prev, deliveryLinks: parsed }));
}

const storedHours = localStorage.getItem(`${pfx}edit_hours_${pid}`);
if (storedHours) {
  const parsed = JSON.parse(storedHours);
  setFormData(prev => ({ ...prev, openingHours: parsed }));
}

const storedHalal = localStorage.getItem(`${pfx}edit_halal_${pid}`);
if (storedHalal) {
  const parsed = JSON.parse(storedHalal);
  setFormData(prev => ({
    ...prev,
    verificationMethod: parsed.verificationMethod,
    hasCertificate: parsed.hasCertificate,
    certificateUrl: parsed.certificateUrl,
    noAlcohol: parsed.noAlcohol ?? prev.noAlcohol,
    noPork: parsed.noPork ?? prev.noPork,
    noGambling: parsed.noGambling ?? prev.noGambling,
  }));
}

const storedValues = localStorage.getItem(`${pfx}edit_values_${pid}`);
if (storedValues) {
  const parsed = JSON.parse(storedValues);
  setFormData(prev => ({ ...prev, ...parsed }));
}
```

### 9.3 Extend admin page `saveProviderEdits`

In `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`, add new fields to the request body:

```typescript
const requestBody: Record<string, unknown> = {
  // ...existing fields...
  
  // New fields
  menuItems: formData.menuItems,
  deliveryLinks: formData.deliveryLinks,
  openingHours: formData.openingHours || null,
  verificationMethod: formData.verificationMethod,
  hasCertificate: formData.hasCertificate,
  certificateUrl: formData.certificateUrl || null,
  muslimOwned: formData.muslimOwned,
  hasPrayerSpace: formData.hasPrayerSpace,
  familyFriendly: formData.familyFriendly,
  womenFriendly: formData.womenFriendly,
  childrenFriendly: formData.childrenFriendly,
  makesDonations: formData.makesDonations,
  hasParking: formData.hasParking,
  economicSolidarity: formData.economicSolidarity,
  noAlcohol: formData.noAlcohol,
  noPork: formData.noPork,
  noGambling: formData.noGambling,
};

// Remove deprecated fields
// delete requestBody.offersIds;
// delete requestBody.needsIds;
```

---

## 10. Full Affected Files List

### DB Migrations
| File | Action |
|------|--------|
| `supabase/migrations/20260604120000_delivery_platform_links.sql` | Apply to live DB |
| `supabase/migrations/094_plan_145_provider_edit_page.sql` | CREATE (see Section 11) |

### Delete
| File | Reason |
|------|--------|
| `src/app/(dashboard)/dashboard/providers/[id]/edit/offers/page.tsx` | Deprecated offers section |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/needs/page.tsx` | Deprecated needs section |

### Modify
| File | Change |
|------|--------|
| `src/components/providers/ProviderEditForm.tsx` | Remove offers/needs, add 6 new sections, extend `ProviderEditFormData`, extend localStorage sync, extend UI rows |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | Add new fields to `saveProviderEdits` request body, remove offersIds/needsIds |
| `src/lib/validations/adminSchemas.ts` | Add new fields to `providerEditUpdateSchema`, remove `offersIds`/`needsIds` from both schemas |
| `src/services/admin/providerEdit.ts` | Add writes for menu, delivery, halal, hours, values, certificate; remove junction table writes |
| `src/services/admin/providers.ts` | Optionally extend `getProviderForAdmin` to join extension table data for the edit form |

### Create — Sub-pages
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/providers/[id]/edit/menu/page.tsx` | Menu editor sub-page |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx` | Halal check + certificate upload sub-page |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/delivery/page.tsx` | Delivery links sub-page |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/hours/page.tsx` | Opening hours sub-page |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx` | Values & amenities sub-page |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/enrichment/page.tsx` | Enrichment per-provider sub-page |

### Create — Enrichment Pages
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/enrichment/page.tsx` | Standalone enrichment overview page |

### Create — API
| File | Purpose |
|------|---------|
| `src/app/api/admin/upload-certificate/route.ts` | Certificate file upload endpoint |

### Modify — Components
| File | Change |
|------|--------|
| `src/features/admin/components/EnrichmentReviewPanel.tsx` | Add optional `providerId` prop for per-provider filtering |

### Test Files
| File | Purpose |
|------|---------|
| `src/services/admin/__tests__/providerEdit.test.ts` | Tests for new service layer writes |
| New test files per sub-page component | Logic tests for form state management |

---

## 11. Migration SQL: `094_plan_145_provider_edit_page.sql`

```sql
-- ============================================================
-- Migration: Plan 145 — Provider Edit Page Rebuild
-- ============================================================

-- 1. Add category column to food_menu
ALTER TABLE public.food_menu
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.food_menu.category IS 'Plan 145: Menu item category for grouping (e.g. appetizer, main, dessert, drinks)';

-- 2. Add certificate_url to food_providers
ALTER TABLE public.food_providers
  ADD COLUMN IF NOT EXISTS certificate_url TEXT;

COMMENT ON COLUMN public.food_providers.certificate_url IS 'Plan 145: URL to uploaded halal certificate file';

-- 3. Add certificate_url to store_providers
ALTER TABLE public.store_providers
  ADD COLUMN IF NOT EXISTS certificate_url TEXT;

COMMENT ON COLUMN public.store_providers.certificate_url IS 'Plan 145: URL to uploaded halal certificate file';

-- 4. Create storage bucket for provider certificates
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'provider-certificates',
  'provider-certificates',
  true,
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies for provider-certificates bucket

-- Public read access (certificate files need to be viewable on provider pages)
CREATE POLICY "Public read access for provider-certificates"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'provider-certificates');

-- Service role full access
CREATE POLICY "Service role all for provider-certificates"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'provider-certificates')
  WITH CHECK (bucket_id = 'provider-certificates');

-- Authenticated users can insert into their own provider's folder
-- The path format is: {providerId}/{uuid}-{filename}
-- We verify ownership by checking the provider belongs to the user
-- (or the user is an admin, handled at the API level)
CREATE POLICY "Authenticated insert for provider-certificates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-certificates'
  );

-- 6. Add RLS policies for food_menu (if not already existing)
ALTER TABLE public.food_menu ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'food_menu' AND policyname = 'Allow public read access for food_menu'
  ) THEN
    CREATE POLICY "Allow public read access for food_menu"
      ON public.food_menu
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'food_menu' AND policyname = 'Allow service role all for food_menu'
  ) THEN
    CREATE POLICY "Allow service role all for food_menu"
      ON public.food_menu
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 7. Add RLS policies for provider_delivery_links (the table from the existing migration)
-- These might already exist if the migration was applied, but safe to re-run
ALTER TABLE public.provider_delivery_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_delivery_links' AND policyname = 'Allow public read access for provider_delivery_links'
  ) THEN
    CREATE POLICY "Allow public read access for provider_delivery_links"
      ON public.provider_delivery_links
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'provider_delivery_links' AND policyname = 'Allow service role all for provider_delivery_links'
  ) THEN
    CREATE POLICY "Allow service role all for provider_delivery_links"
      ON public.provider_delivery_links
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- 8. Create index on food_menu provider_id for faster queries if not exists
CREATE INDEX IF NOT EXISTS idx_food_menu_provider_id
  ON public.food_menu(provider_id);
```

---

## 12. Architect Findings Resolution

The architecture review found 3 HIGH and 3 MEDIUM items that must be addressed. This section documents the resolutions incorporated into this plan.

### HIGH-1: Multi-table writes → Wrap in Supabase RPC (transaction)

**Fix**: All multi-table writes in `updateProviderFields` will be wrapped in a single Supabase RPC (plpgsql function) that uses `BEGIN ... COMMIT` / `ROLLBACK`. The function accepts a JSON payload and handles all writes atomically.

New RPC function: `admin_update_provider(p_provider_id UUID, p_data JSONB)`

This function handles:
1. UPDATE `providers` (basic fields, contact, address, images, opening_hours, amenity booleans)
2. UPSERT `food_providers` / `store_providers` (verification_method, has_certificate, certificate_url, no_alcohol, no_pork, no_gambling)
3. DELETE + INSERT `food_menu` (menu items array replacement)
4. DELETE + INSERT `provider_delivery_links` (delivery links array replacement)
5. All wrapped in a single transaction

If the JS-side service layer needs to perform pre/post processing (e.g., file upload), the PATCH API will: (1) upload file to storage, (2) call RPC with all data including the resulting URL.

### HIGH-2: Storage bucket RLS → Use service-role exclusively

**Fix**: Remove the permissive authenticated-insert policy entirely. The certificate upload API endpoint (`POST /api/admin/upload-certificate`) will use `getSupabaseAdmin()` (service-role client) for all storage operations. Since the endpoint already validates admin/moderator access, this provides defense-in-depth without RLS.

Storage policies:
- `storage.objects`: Only service-role client has access (no public RLS policies)
- `provider-certificates` bucket: Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Max file size: 5MB (validated at API level)

### HIGH-3: Extension table joins → Make mandatory in admin API

**Fix**: Extend `getProviderForAdmin()` to left-join `food_providers` and `store_providers`:

```typescript
const { data, error } = await supabase
  .from('providers')
  .select(`
    *,
    categories:category_id(*),
    food_providers(*),
    store_providers(*)
  `)
  .eq('provider_id', providerId)
  .single();
```

Create a proper typed interface for the result:

```typescript
interface AdminProviderWithExtensions extends Provider {
  food_providers?: {
    verification_method: string | null;
    has_certificate: boolean;
    certificate_url: string | null;
    no_alcohol: boolean;
    no_pork: boolean;
    no_gambling: boolean;
  } | null;
  store_providers?: {
    verification_method: string | null;
    has_certificate: boolean;
    certificate_url: string | null;
    no_gambling: boolean;
  } | null;
}
```

### MEDIUM-4: Type casting → Proper return type

**Fix**: The `AdminProviderWithExtensions` type (from HIGH-3) replaces all `(provider as any)` casts. ProviderEditForm will check `provider.food_providers?.verification_method` with proper typing. The form's `ProviderEditFormData` will include properly typed extension fields.

### MEDIUM-5: Client-side Supabase queries → Admin API endpoints

**Fix**: Create dedicated admin API endpoints for fetching sub-page data:
- `GET /api/admin/providers/:id/menu` — returns menu items for this provider
- `GET /api/admin/providers/:id/delivery-links` — returns delivery links for this provider

The sub-pages will `fetch()` these endpoints instead of using the client-side Supabase client. The edit form will also fetch the initial data via the admin provider API (which now includes extension tables via HIGH-3).

### MEDIUM-6: God function → Refactor into focused sub-functions

**Fix**: `updateProviderFields` will be refactored into focused functions per domain:

```typescript
// Main orchestrator
async function updateProviderFields(providerId, editData): Promise<void> {
  const rpcPayload = buildRpcPayload(editData);
  await supabase.rpc('admin_update_provider', {
    p_provider_id: providerId,
    p_data: rpcPayload,
  });
}

// Build the JSON payload for the RPC call
function buildRpcPayload(editData: AdminProviderEditData): object {
  return {
    basic_fields: extractBasicFields(editData),
    extension_fields: extractExtensionFields(editData),
    menu_items: editData.menuItems,
    delivery_links: editData.deliveryLinks,
    opening_hours: editData.openingHours,
    amenities: extractAmenities(editData),
  };
}
```

Each `extract*` function is independently testable and maps form data → DB column names.

### Summary of Changes from the Architect Review

| Finding | Resolution | Impact on Plan |
|---------|-----------|----------------|
| HIGH-1 | RPC-based transaction | New migration + `supabase.rpc()` call replaces direct table writes |
| HIGH-2 | Service-role storage only | Remove storage RLS policy, upload via admin API |
| HIGH-3 | Mandatory extension table joins | Extend `getProviderForAdmin()`, create `AdminProviderWithExtensions` type |
| MEDIUM-4 | Proper return type | Eliminate `as any` casts, use typed interface |
| MEDIUM-5 | Admin API endpoints for sub-pages | New API routes + sub-pages use `fetch()` not `supabase.from()` |
| MEDIUM-6 | Focused sub-functions | Refactor `updateProviderFields`, each domain gets its own function |
