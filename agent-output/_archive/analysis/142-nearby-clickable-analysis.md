---
ID: 142
Origin: 142
UUID: a3f7c2b1
Status: Active
---

# Analysis: Nearby Provider Click Navigation (Plan 142)

## 1. Confirmed Routing Pattern

**URL Format**: `/providers/${provider_id}`

**Navigation Method**: `router.push()` — the dominant pattern across the codebase for provider navigation within `'use client'` components. Confirmed in:
- `src/app/(public)/providers/ProvidersContent.tsx:259` — `router.push(`/providers/${provider.provider_id}`)`
- `src/components/providers/ProviderDetailPage.tsx:921` — `router.push(`/providers/${supportingProvider.provider_id}`)`
- `src/components/providers/ProviderDetailPage.tsx:474` — `router.push(`/providers/${service.community_service_id}`)`
- `src/components/community-services/CommunityServiceDetailModal.tsx:493` — `router.push(`/providers/${provider.provider_id}`)`
- `src/app/(public)/profile/ProfileContent.tsx` — 10+ instances of the same pattern

`<Link href={`/providers/${id}`}>` is rarely used and only appears in non-interactive contexts (`not-found.tsx`, `ExploreSection.tsx`). The codebase consistently uses `<button>` + `router.push()` for clickable cards/rows.

The route is defined at `src/app/(public)/providers/[provider_id]/page.tsx` which renders `ProviderDetailPageClient`.

## 2. Implementation Approach Recommendation

**Option A (recommended): Add optional `onClick` to `DetailListItem`**

Modify `DetailListItem` to accept an optional `onClick` handler. When provided, render a `<button>` instead of a `<div>`:

```tsx
function DetailListItem({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E3F2EF] text-primary">
        {icon}
      </span>
      <span className="text-base font-semibold text-content-heading">{label}</span>
    </Component>
  );
}
```

This is the lightest change. `DetailListItem` is only used within this file, so there's no external impact. When no `onClick` is passed (amenities, menu items), it renders as a `<div>` as today.

**Option B: Wrap in `<Link>` directly in the nearby `map`**

This would create inconsistency (3 other `DetailListItem` usages stay as `<div>`) and break the component abstraction.

**Option C: Separate `ClickableDetailListItem` component**

Over-engineering for a single clickable instance.

**Verdict**: Option A. Simple, contained, follows the existing `<button>` + navigation pattern used everywhere else (e.g., `ProviderDetailPage.tsx:917-922`).

### Integration

In `ProviderDetailSections.tsx`, import `useRouter` from `next/navigation` and wire the nearby items:

```tsx
nearbyProviders.map((nearby) => (
  <DetailListItem
    key={nearby.provider_id}
    icon={<MapPin aria-hidden="true" className="h-6 w-6" />}
    label={nearby.provider_name}
    onClick={() => router.push(`/providers/${nearby.provider_id}`)}
  />
))
```

## 3. Edge Cases Identified

| Edge Case | Risk | Mitigation |
|-----------|------|------------|
| `provider_id` is `undefined` or empty | Navigation to `/providers/undefined` which shows a 404 page | The `NearbyResult` type has `provider_id: string` (required). The RPC and fallback query both return `provider_id` from the DB, so it should always be present. Low risk. |
| Click during loading/refetching | Not possible — loading state shows a `<p>` text, not `DetailListItem` | Already handled by the conditional rendering at line 250-262. |
| Zero nearby results | Not applicable — empty state shows fallback text | Already handled at line 252. |
| Slow navigation / perceived lag | `router.push` triggers a client-side transition; the provider page shows a skeleton | Already built into `ProviderDetailPageClient`. Could add `router.prefetch()` as enhancement. |
| Keyboard accessibility | `<div>` (current) is not focusable or keyboard-navigable | When `onClick` is provided, the component renders as `<button>`, which is inherently keyboard-accessible. |

## 4. Component Scope Analysis

**`DetailListItem` usage** — only within `ProviderDetailSections.tsx`:

| Location | Line | Has `onClick`? |
|----------|------|----------------|
| Definition | 130 | N/A |
| Amenities map | 203 | No (stays as div) |
| Menu items map | 217 | No (stays as div) |
| Nearby items map | 256 | **Yes (to be added)** |

No other file in the codebase imports or references `DetailListItem`. All changes are fully contained within this single file.

## 5. Test Considerations

**Existing tests**: `src/__tests__/features/providers/ProviderDetailSections.test.tsx` (317 lines, 9 tests).

Test infrastructure:
- `useRouter` is mocked globally in `src/__tests__/utils/test-utils.tsx` (line 35-42) with `push: vi.fn()`
- `useQuery` is mocked per-test via `useQueryMock`
- RTL `fireEvent` is used to click expand buttons

**What tests exist that are relevant**:
- Line 267: `'[plan-141] renders nearby provider names from query data'` — renders two nearby items and verifies the text appears. This test can be extended to verify clickability.
- No existing tests for navigation behavior from this component.

**New tests needed**:

1. **Navigation on nearby item click**: Render with `nearbyProviders` data, click a nearby item, assert `router.push` was called with `/providers/${id}`.
2. **Missing ID guard**: If `provider_id` is empty, verify no navigation occurs.

**Test pattern** (using existing `router.push` mock):
```tsx
it('navigates to nearby provider on click', () => {
  useQueryMock.mockReturnValue({
    data: [{ provider_id: 'nearby-1', provider_name: 'Restaurant A' }],
    isLoading: false,
    isFetching: false,
  });

  const { push } = useRouter(); // from mock
  render(<ProviderDetailSections ... />);
  
  fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
  fireEvent.click(screen.getByText('Restaurant A'));
  
  expect(push).toHaveBeenCalledWith('/providers/nearby-1');
});
```
