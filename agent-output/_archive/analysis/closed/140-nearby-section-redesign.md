---
ID: 140
Origin: 140
UUID: 835d9083
Status: Released
---

# Analysis: "In der Nähe" (Nearby) Section Redesign

## Changelog
| 2026-06-04 | DevOps | Document closed | Status: Released |

## 1. Lines to change

The nearby providers block is at lines 228–242 of `src/features/providers/components/ProviderDetailSections.tsx`:

```
228:       <ExpandSection title={t('providerDetail.sections.nearby')}>
229:         <div className="space-y-2 pt-3">
230:           {isLoadingNearbyProviders || isFetchingNearbyProviders ? (
231:             <p className="text-sm text-[#7a7a7a]">{t('providerDetail.loading.nearby')}</p>
232:           ) : nearbyProviders.length === 0 ? (
233:             <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noNearby')}</p>
234:           ) : (
235:             nearbyProviders.map((nearby) => (
236:               <p key={nearby.provider_id} className="text-sm text-content-heading">
237:                 {nearby.provider_name}
238:               </p>
239:             ))
240:           )}
241:         </div>
242:       </ExpandSection>
```

Only the data-rendering branch (lines 235–239) needs to change. The loading/empty states (lines 230–233) stay as-is — they render plain `<p>` fallback text, which is correct.

## 2. Recommended icon: `MapPin`

| Icon | Fit | Reason |
|------|-----|--------|
| `Store` | Medium | Too specific — implies a retail shop, but nearby providers can be restaurants, mosques, services, etc. |
| `Building2` | Low | Corporate/office connotation; doesn't convey "nearby location". |
| **`MapPin`** | **Best** | Universally recognized location pin; directly communicates "places near you". Matches the spatial/navigation context. |

## 3. Test impact — no breakage expected

All 8 existing tests mock `useQuery` returning `data: []` for the nearby query, which triggers the empty-state path (`<p>` tag, lines 232–233). No test exercises the data-rendering branch where the `<p>` → `DetailListItem` swap happens.

The only test that directly references the nearby section is `'[post-review fix] shows loading state instead of empty-state while nearby query is loading'` (line 34). It asserts:
- Loading text appears when loading — unchanged, still a `<p>` at line 231.
- Empty text is absent when loading — unchanged.

**No test will break.** However, there is no test coverage for the actual nearby data-rendering branch. Consider adding one if this area needs regression protection.

## 4. Implementation guidance

### 4a. Import `MapPin`

Add `MapPin` to the existing `lucide-react` import at line 4:

```tsx
import {
  CircleParking,
  HandHeart,
  HeartHandshake,
  MapPin,
  Moon,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
```

### 4b. Replace the nearby item `<p>` tag with `DetailListItem`

Change lines 235–239 from:

```tsx
nearbyProviders.map((nearby) => (
  <p key={nearby.provider_id} className="text-sm text-content-heading">
    {nearby.provider_name}
  </p>
))
```

To:

```tsx
nearbyProviders.map((nearby) => (
  <DetailListItem
    key={nearby.provider_id}
    icon={<MapPin aria-hidden="true" className="h-6 w-6" />}
    label={nearby.provider_name}
  />
))
```

### 4c. What stays the same

- Loading/empty state `<p>` tags (lines 230–233) — no changes.
- The `ExpandSection` wrapper and container div — no changes.
- All existing tests pass without modification.

### 4d. Visual result

Each nearby provider will render as a 44px-tall row with a teal `bg-[#E3F2EF]` circle containing the `MapPin` icon, followed by the provider name in `text-base font-semibold text-content-heading` — matching the Menu section's appearance.
