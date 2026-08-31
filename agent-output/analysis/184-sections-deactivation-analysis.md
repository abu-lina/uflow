---
ID: 184
Origin: 184
UUID: 49414123
Status: Active
---

# Analysis: Deactivate "ummah" and "stores" sections for release

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | Analyst (opencode) | Initial analysis of all files involved in section deactivation |

## 2. Value Statement

The product owner needs to release the app but "ummah" and "stores" sections are unfinished. Keeping them fully active means users land on non-functional pages and empty result sets, creating a poor first impression. Making them visible with "Soon" badges preserves the UX vision while protecting the release quality bar for the food-only launch.

## 3. Current State

All three sections (food, ummah, store) are equally active today. There is no deactivation mechanism.

### 3a. SectionSelector renders all tabs equally

`src/features/search/components/SectionSelector.tsx:27-67` — renders three interactive `<button>` tabs from `SECTION_ORDER`. No `disabled` or `badge` concept exists.

```tsx
{SECTION_ORDER.map((value) => {
  const isActive = selectedSection === value;
  return (
    <button role="tab" onClick={() => onSectionChange(value)}>
      {renderIcon(isActive)}
      <span>{label}</span>
    </button>
  );
})}
```

### 3b. Route pages delegate directly to ProvidersPage

`src/app/(public)/ummah/page.tsx` and `src/app/(public)/stores/page.tsx` both import and render `ProvidersPage` with a hardcoded `section` parameter. They are full functional pages, not placeholders.

```tsx
export default async function UmmahPage({ searchParams }) {
  const params = await searchParams;
  return ProvidersPage({ searchParams: Promise.resolve({ ...params, section: 'ummah' }) });
}
```

`src/app/(public)/food/page.tsx` has the same structure but should remain active.

### 3c. Section config has no active/inactive flag

`src/config/sectionFilters.ts:14` defines `Section = 'food' | 'ummah' | 'store'`. `SECTION_FILTER_CONFIG` and helper functions (`getResultsPathForSection`, `resolveSectionFromRoute`, etc.) treat all sections uniformly.

`getResultsPathForSection` at line 101 maps `ummah → '/ummah'` and `store → '/stores'`. There is no override for deactivated sections.

### 3d. Header navigates to section routes on tab click

`src/components/layout/Header.tsx:50-54` — `handleSectionChange` calls `router.push(getResultsPathForSection(section))`. All sections navigate to their functional routes.

### 3e. MobileFooterBar already lists Umma/Stores paths

`src/components/common/MobileFooterBar.tsx:69-71` — `isExploreActive` includes `/ummah` and `/stores` paths. This is fine — they stay visible.

### 3f. Search page has its own SectionSelector

`src/app/(public)/search/page.tsx:556-559` — renders `SectionSelector` with full interactivity. Same component, same issue.

### 3g. Translations: no "soon" keys exist for sections

`src/translations/en.ts`, `de.ts`, `ar.ts` — `sections` object only has `food`, `ummah`, `stores` labels (lines 141-145 in each file). No `soon` or `comingSoon` badge key exists under `sections`.

The `statusComingSoon` key exists under `waitlist.citySelection.statusComingSoon` but is unrelated to section tabs.

### 3h. Existing "Coming Soon" pattern in CategoryGallerySection

`src/components/shared/CategoryGallerySection.tsx:121-132` shows a simple inline conditional pattern:

```tsx
if (section) {
  return <p>{isEnglish ? 'Coming soon' : 'Demnächst verfügbar'}</p>;
}
```

This is a pattern but not reusable — it's a plain string, not a component.

### 3i. Existing test confirms three tabs

`src/__tests__/components/SectionSelector.test.tsx:37-42` — asserts three sections exist. Tests will need updating.

**Confidence: Proven** (code inspection confirms all findings).

## 4. Required Changes

### 4a. Section config — add `active` flag (config-driven approach)

**File**: `src/config/sectionFilters.ts`

Add an `isActive` (or similar) boolean to a section registry. Something like:

```ts
export const SECTION_META: Record<Section, { labelKey: string; active: boolean; icon: ... }> = {
  food: { active: true },
  ummah: { active: false },
  store: { active: false },
};
```

Alternatively, a flat `ACTIVE_SECTIONS: Section[]` set. A section registry is more extensible long-term (can add `comingSoonLabelKey`, `badgeVariant`, etc. later).

**Consumers that need this**: SectionSelector, Header, search page, route pages, route resolution.

### 4b. SectionSelector — disabled tab + "Soon" badge

**File**: `src/features/search/components/SectionSelector.tsx`

- Accept or derive per-tab disabled state from section config
- Inactive tabs: render `<button>` with `disabled` attribute, muted styling, and a small "Soon" badge
- Prevent `onSectionChange` from firing for inactive sections
- Keep `aria-selected` functional (inactive can still be selected/displayed if user lands there via URL, but don't allow clicking)

The `getSectionLabel` function also needs a companion for the badge label (e.g., `t('sections.soon')`).

### 4c. SectionIconRenderers — no change needed

**File**: `src/features/search/constants/sectionIconRenderers.tsx`

Icons are fine. The disabled/badge state lives in SectionSelector, not here.

### 4d. Route pages — redirect or placeholder for inactive sections

**File**: `src/app/(public)/ummah/page.tsx`

Two options:

1. **Redirect** — if `section.active === false`, redirect to `/food` (or show a placeholder)
2. **Placeholder** — render a "Coming Soon" view instead of `ProvidersPage`

Option 2 is better for UX (no surprise redirect) and matches the PO request ("Coming soon placeholder").

```tsx
import { SECTION_META } from '@/config/sectionFilters';

export default async function UmmahPage({ searchParams }) {
  const params = await searchParams;
  if (!SECTION_META.ummah.active) {
    return <ComingSoonPlaceholder section="ummah" />;
  }
  return ProvidersPage({ searchParams: Promise.resolve({ ...params, section: 'ummah' }) });
}
```

Same for `src/app/(public)/stores/page.tsx`.

**File**: `src/app/(public)/food/page.tsx` — no change (stays active).

A `<ComingSoonPlaceholder>` component should be created in `src/components/shared/` or `src/features/sections/components/` (reusable for both inactive sections).

### 4e. Header — pass disabled state or guard navigation

**File**: `src/components/layout/Header.tsx`

`handleSectionChange` at line 50-54 should check `SECTION_META[section].active` before navigating. If inactive, either do nothing or show a toast. The SectionSelector component should handle this internally (disabled button + no onClick), so the Header's callback won't fire for inactive sections. But adding a guard in the callback is defensive.

### 4f. Search page — guard section change

**File**: `src/app/(public)/search/page.tsx`

`handleSectionChange` at line 425-433 should check if the target section is active. If inactive, either skip the URL update or the SectionSelector's disabled state should prevent the callback from firing. Same defensive guard.

### 4g. MobileFooterBar — isExploreActive check

**File**: `src/components/common/MobileFooterBar.tsx`

Lines 69-71 include `/ummah` and `/stores` in `isExploreActive`. This is fine — these are paths, not sections. No change needed here.

### 4h. RootClientLayout — providers discovery check

**File**: `src/components/layout/RootClientLayout.tsx`

Line 87: `isProvidersDiscovery` includes `/ummah` and `/stores`. This is fine — it controls mobile footer visibility. If the route shows a placeholder, the footer should still show.

### 4i. Translations — add "Soon" badge key

**Files**: `src/translations/en.ts`, `src/translations/de.ts`, `src/translations/ar.ts`

Add under `sections`:

```ts
"sections": {
  "food": "Food",
  "ummah": "Ummah",
  "stores": "Stores",
  "soon": "Soon"       // or "comingSoon": "Soon"
}
```

### 4j. Tests — update SectionSelector tests

**File**: `src/__tests__/components/SectionSelector.test.tsx`

- Add test for disabled tab rendering (disabled attribute + no onClick propagation)
- Add test for badge visibility on inactive sections
- Add test verifying active section tabs remain clickable

Also consider: new tests for `ComingSoonPlaceholder` component.

**File**: `src/__tests__/features/search/components/UmmahFilterSection.test.tsx` — doesn't exist yet (glob returned no results). Not a blocker but worth noting.

### 4k. ProvidersPage — no change needed

The server component at `src/app/(public)/providers/page.tsx` receives `section` as a parameter. It works fine. The route pages for ummah/stores will intercept before calling this.

## 5. Recommended Approach: Config-driven with SECTION_META

Add a section metadata registry in `src/config/sectionFilters.ts`:

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

This is better than hardcoded checks because:
- One source of truth for all consumers
- PO can flip sections active/inactive via a single config change
- Extensible (add `badgeVariant`, `placeholderComponent`, etc.)

### Implementation order

1. Add `SECTION_META` to `sectionFilters.ts` + `sections.soon` to translation files
2. Update `SectionSelector` to read `SECTION_META`, render disabled tabs + badges
3. Create `ComingSoonPlaceholder` shared component
4. Update `/ummah` and `/stores` route pages to check `SECTION_META` and render placeholder
5. Guard `handleSectionChange` in Header and search page (defensive)
6. Update tests

## 6. Confidence Levels

| Finding | Level | Evidence |
|---|---|---|
| All sections equally active today | Proven | Direct code inspection of SectionSelector, route pages, sectionFilters |
| Route pages delegate to ProvidersPage | Proven | `ummah/page.tsx` and `stores/page.tsx` both import and render ProvidersPage |
| No active/inactive flag in config | Proven | `sectionFilters.ts` has no metadata beyond filters |
| No "Soon" badge translation key exists | Proven | Translation files searched — only `statusComingSoon` exists under `waitlist.citySelection` |
| SectionSelector has no disabled/badge logic | Proven | Component renders all tabs as active buttons with no disabled state |
| Header navigates to all section routes | Proven | `handleSectionChange` calls `getResultsPathForSection` without guard |
| MobileFooterBar includes /ummah and /stores | Proven | `isExploreActive` check includes both paths |
| Existing "Coming Soon" pattern is inline, not reusable | Proven | `CategoryGallerySection.tsx:121-132` uses plain strings |
| Tests assert three sections exist | Proven | `SectionSelector.test.tsx` expects Food, Ummah, Stores tabs |

## 7. Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---|---|---|---|
| 1 | Should clicking an inactive tab show a toast/message or just be no-op? | Not specified in PO request | Clarify UX behavior: silent no-op vs tooltip/toast | PO |
| 2 | What should the "Coming Soon" placeholder layout look like? | Not defined | Need design mockup or verbal spec for placeholder content | PO/Designer |
| 3 | Should the URL still update if a user manually visits `/ummah` or `/stores`? | Impacts redirect vs placeholder decision | Clarify: is `/ummah` a 301 redirect to `/food` or a "Coming soon" page? | PO |
| 4 | Does the search page's URL-based section resolution need to protect against inactive sections? | Search-page `handleSectionChange` coerces section from URL | Test: what happens if `?section=ummah` is in URL on search page with inactive config? | Analyst after decision |
| 5 | Should `ProvidersPage` itself check the section config or trust the caller? | Defensive vs trust-based | If route pages are the sole entry point, ProvidersPage needs no change. Confirm all entry points. | Analyst |
