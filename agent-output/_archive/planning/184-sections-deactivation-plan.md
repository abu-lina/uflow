---
ID: 184
Origin: 184
UUID: a3f1c8b2
Status: Active
---

# Implementation Plan: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | Planner (opencode) | Created implementation plan from analysis document + PO decisions |

## 2. Summary

Deactivate the "ummah" and "stores" sections for the Food-only release. Tabs remain visible in the SectionSelector with a "Soon" badge and disabled click behavior. Direct URL access to `/ummah` or `/stores` redirects to `/food`. Implemented via a config-driven `SECTION_META` registry in `sectionFilters.ts` — one source of truth for active/inactive state.

## 3. Implementation Steps (ordered)

### Step 1: Add SECTION_META config to sectionFilters.ts

**File**: `src/config/sectionFilters.ts`

**Change**: Add a `SectionMeta` interface and `SECTION_META` constant alongside the existing `SECTION_FILTER_CONFIG`:

```ts
export interface SectionMeta {
  active: boolean;
  labelKey: string;
  badgeKey?: string;
}

export const SECTION_META: Record<Section, SectionMeta> = {
  food: { active: true, labelKey: 'sections.food' },
  ummah: { active: false, labelKey: 'sections.ummah', badgeKey: 'sections.soon' },
  store: { active: false, labelKey: 'sections.stores', badgeKey: 'sections.soon' },
};
```

**Rationale**: Single config source for all consumers. PO can flip sections active/inactive by changing one boolean. Badge keys enable i18n.

**Also update** `getResultsPathForSection` to optionally handle inactive sections (return `/food` path) — or leave as-is since route pages will handle redirect. The route redirect approach is simpler: keep `getResultsPathForSection` returning canonical paths, let route pages redirect.

### Step 2: Add translation keys for "Soon" badge

**Files**:
- `src/translations/en.ts` — add `"soon": "Soon"` under `sections`
- `src/translations/de.ts` — add `"soon": "Demnächst"` under `sections`
- `src/translations/ar.ts` — add `"soon": "قريباً"` under `sections`

**Change**: Append to the `sections` object in each file:
```ts
"sections": {
  "food": "Food",
  "ummah": "Ummah",
  "stores": "Stores",
  "soon": "Soon"  // ← add this line
}
```

**Rationale**: Badge label must be translatable. Each locale gets its own translation.

### Step 3: Update SectionSelector to render disabled tabs + "Soon" badge

**File**: `src/features/search/components/SectionSelector.tsx`

**Change**:

1. Import `SECTION_META` from `@/config/sectionFilters`
2. In the map loop, read `SECTION_META[value]` to determine disabled + badge state
3. Inactive tabs: render `<button>` with:
   - `disabled` attribute (prevents click, silent no-op)
   - Muted/opacity styling (e.g., `opacity-50 cursor-not-allowed`)
   - A small "Soon" badge element (e.g., `<span className="text-[10px] px-1 py-0.5 rounded bg-neutral-200 text-neutral-600">Soon</span>`)
   - Still render icon and label
   - Keep `aria-selected` functional (inactive tabs can still be visually selected if user lands via URL)
4. Remove the `onClick` or let the `disabled` attribute prevent it

**Expected structure** (inside the button):
```tsx
const meta = SECTION_META[value];
const isDisabled = !meta.active;
// ...
<button disabled={isDisabled} onClick={() => !isDisabled && onSectionChange(value)}>
  {renderIcon(isActive)}
  <span>{label}</span>
  {isDisabled && <span className="...">{t(meta.badgeKey)}</span>}
</button>
```

**Rationale**: Per PO decision — silent no-op on click. Disabled attribute achieves this natively. Badge appears as a small chip inside the tab.

### Step 4: Update route pages to redirect inactive sections to /food

**File**: `src/app/(public)/ummah/page.tsx`

**Change**: Replace the current direct delegation to `ProvidersPage` with a redirect to `/food`:

```tsx
import { redirect } from 'next/navigation';
import { SECTION_META } from '@/config/sectionFilters';

export default async function UmmahPage() {
  if (!SECTION_META.ummah.active) {
    redirect('/food');
  }
  // ... existing code stays for when section is reactivated
}
```

**File**: `src/app/(public)/stores/page.tsx`

**Change**: Same pattern for stores:

```tsx
import { redirect } from 'next/navigation';
import { SECTION_META } from '@/config/sectionFilters';

export default async function StoresPage() {
  if (!SECTION_META.store.active) {
    redirect('/food');
  }
  // ... existing code stays for when section is reactivated
}
```

**File**: `src/app/(public)/food/page.tsx` — **no change** (stays active).

**Rationale**: PO decision — direct URL access to `/ummah` or `/stores` redirects to `/food`. Using `redirect()` from `next/navigation` for a server-side 307 redirect. The existing code that delegates to `ProvidersPage` stays in place so undoing the deactivation is just a config flip.

### Step 5: Guard handleSectionChange in Header

**File**: `src/components/layout/Header.tsx`

**Change**: In `handleSectionChange` (lines 50-54), add a defensive guard:

```tsx
import { SECTION_META } from '@/config/sectionFilters';

const handleSectionChange = (section: Section) => {
  if (!SECTION_META[section].active) return;  // silent no-op
  setSelectedSection(section);
  const params = new URLSearchParams({ section });
  router.push(`${getResultsPathForSection(section)}?${params.toString()}`);
};
```

**Rationale**: SectionSelector's `disabled` attribute should prevent the callback from firing, but this guard ensures any code path that calls `handleSectionChange` with an inactive section is safe.

### Step 6: Guard handleSectionChange in Search page

**File**: `src/app/(public)/search/page.tsx`

**Change**: In `handleSectionChange` (lines 425-433), add the same defensive guard:

```tsx
import { SECTION_META } from '@/config/sectionFilters';

const handleSectionChange = (section: Section) => {
  if (!SECTION_META[section].active) return;  // silent no-op
  if (section === urlSection) return;
  const params = new URLSearchParams(searchParams.toString());
  params.set('section', section);
  router.replace(`/search?${params.toString()}`);
};
```

**Also update** `resolveSection` at lines 49-54 to default inactive sections to `'food'`:

```tsx
const resolveSection = (rawSection: string | null): Section => {
  if (rawSection === 'ummah' || rawSection === 'store' || rawSection === 'business') {
    const resolved = rawSection === 'business' ? 'store' : rawSection;
    return SECTION_META[resolved].active ? resolved : 'food';
  }
  return 'food';
};
```

**Rationale**: Prevents URL-based section resolution from picking inactive sections. If someone manually edits the URL to include `?section=ummah`, the search page will resolve it to `food`.

### Step 7: Update tests

**File**: `src/__tests__/components/SectionSelector.test.tsx`

**Changes**:

1. Update the `useLanguage` mock to include `sections.soon`:
   ```ts
   'sections.soon': 'Soon',
   ```

2. Add mock for `SECTION_META` import (or wire it via the actual module dependency).

3. **Add test**: "renders disabled tabs for inactive sections"
   - Verify that ummah and store buttons have `disabled` attribute.

4. **Add test**: "renders Soon badge on inactive sections"
   - Verify that ummah and store buttons contain a "Soon" text element.

5. **Add test**: "clicking inactive section tab does not call onSectionChange"
   - Click disabled tab, verify callback not called.

6. **Update existing test**: "renders three section buttons" — still expects three tabs; update to include badge check if needed.

7. **Update existing test**: "calls onSectionChange with store when stores button is clicked" — may need to adjust if the store button is now disabled.

**Rationale**: Tests must cover the new disabled/badge behavior. The existing "click stores" test should be updated to verify the callback does NOT fire for inactive sections.

## 4. Implementation Order

| Order | Step | Depends On |
|---|---|---|
| 1 | Step 1: SECTION_META config | Nothing |
| 2 | Step 2: Translation keys | Nothing (parallel with step 1) |
| 3 | Step 3: SectionSelector disabled + badge | Steps 1, 2 |
| 4 | Step 4: Route page redirects | Step 1 |
| 5 | Step 5: Header guard | Step 1 |
| 6 | Step 6: Search page guard | Step 1 |
| 7 | Step 7: Tests | Steps 3, 4 |

Steps 1-2 can be done in parallel. Steps 5-6 can be done in parallel after Step 1.

## 5. Test Strategy

### Updated tests (`SectionSelector.test.tsx`)

| Test | What it verifies |
|---|---|
| "renders three section buttons" | All 3 tabs still render (existing, may need minor update for mock) |
| "marks the active section with aria-selected" | aria-selected still works (existing, no change) |
| "renders disabled attribute on inactive tabs" | `disabled` attribute present on ummah and store buttons |
| "renders Soon badge on inactive section tabs" | "Soon" text visible in ummah/store buttons, absent in food |
| "clicking inactive section tab is no-op" | Click on disabled tab does not fire `onSectionChange` |
| "clicking active section tab still works" | Click on food tab still fires `onSectionChange` (revised existing test) |

### Manual verification

- Navigate to `/ummah` → should redirect to `/food`
- Navigate to `/stores` → should redirect to `/food`
- Navigate to `/food` → should render normally
- Click "Ummah" tab in Header → nothing happens
- Click "Stores" tab in SectionSelector on search page → nothing happens
- "Soon" badge visible inside Ummah and Stores tabs

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Search page URL manually set to `?section=ummah` bypasses client guard | Medium | `resolveSection` in search page defaults inactive sections to `food`; route page redirects as final safety net |
| MobileFooterBar or RootClientLayout shows stale section UI for inactive sections | Low | Both check pathname, not section config — they show `/ummah` and `/stores` paths which will redirect to `/food`, so no stale state issue |
| Disabled tab styling breaks layout | Low | Badge is inline; use `flex` with `gap-1` to prevent overflow. Test at 320px width |
| Type mismatch if Section type diverges between `sectionFilters.ts` and `search-provider.tsx` | Low | `search-provider.tsx` re-exports from `sectionFilters.ts` — single source of truth |
| `redirect()` from server component may cause unexpected flash for bots | Low | Next.js `redirect()` is a 307, fine for SEO. If crawlers don't follow redirects, `/ummah` and `/stores` will just show no content — acceptable for inactive sections |
