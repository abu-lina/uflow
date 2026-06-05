---
ID: 142
Origin: 142
UUID: a3f7c2b1
Status: Active
---

# Plan: Nearby Provider Click Navigation

## Summary

Make nearby provider list items in `ProviderDetailSections.tsx` clickable. When a user taps a nearby provider, they navigate to `/providers/${provider_id}`.

## File Changes

### `src/features/providers/components/ProviderDetailSections.tsx`

| Change | Detail |
|--------|--------|
| `DetailListItem` signature | Add optional `onClick?: () => void` prop |
| `DetailListItem` render | When `onClick` is provided, render `<button>` instead of `<div>` |
| Import `useRouter` | Add `useRouter` from `next/navigation` |
| Nearby `map` | Pass `onClick={() => router.push(`/providers/${nearby.provider_id}`)}` on nearby items |

No other file changes needed — `DetailListItem` is local to this file only.

## Implementation Steps

### Step 1: Modify `DetailListItem` to accept optional `onClick`

Change the component to conditionally render a `<button>` (with `onClick`) or a `<div>` (without).

Target: `ProviderDetailSections.tsx:130-138`

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

Since `<button>` renders as a `button` element and `<div>` renders as a `div`, this maintains keyboard accessibility automatically for clickable items.

### Step 2: Import `useRouter` from `next/navigation`

Add to the existing import block at line 3:

```tsx
import { useMemo, type ComponentType, type ReactNode, type SVGProps } from 'react';
```
→
```tsx
import { useMemo, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
```

### Step 3: Wire `onClick` on nearby items

Inside the `ProviderDetailSections` component, call `useRouter()` and pass `onClick` to the nearby `DetailListItem`.

```tsx
// Inside ProviderDetailSections, after const { t } = useLanguage();
const router = useRouter();
```

Then in the nearby `map`:

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

Amenities, menu items, and other `DetailListItem` usages remain unchanged (no `onClick` prop → renders as `<div>`).

### Step 4: Add tests for click behavior

See Testing Strategy below.

## Testing Strategy

### Test file: `src/__tests__/features/providers/ProviderDetailSections.test.tsx`

**Add two new tests** after the existing `[plan-141] renders nearby provider names from query data` test (line 267):

1. **Navigation on nearby item click** — mock nearby data, click the item, assert `router.push` was called with correct path
2. **Non-navigable items don't trigger navigation** — click an amenities or menu item, assert `router.push` was NOT called

The `useRouter` mock is already set up globally in `src/__tests__/utils/test-utils.tsx` (line 35-42), where `push` is a `vi.fn()`. Tests can import `useRouter` from `next/navigation` (even though it's mocked) or simply assert on the mock's call arguments.

**Test skeleton:**

```tsx
import { useRouter } from 'next/navigation';

// ...

it('navigates to nearby provider page when nearby item is clicked', () => {
  const { push } = useRouter();
  useQueryMock.mockReturnValue({
    data: [{ provider_id: 'nearby-1', provider_name: 'Restaurant A' }],
    isLoading: false,
    isFetching: false,
  });

  render(
    <ProviderDetailSections
      badges={[]}
      isLoadingBadges={false}
      provider={{ ...mockProviders[0], offers: [], needs: [] }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
  fireEvent.click(screen.getByText('Restaurant A'));

  expect(push).toHaveBeenCalledWith('/providers/nearby-1');
});
```

## Acceptance Criteria

| Criteria | How to Verify |
|----------|---------------|
| Nearby items render as `<button>` elements | In the browser or test: inspect the nearby item element; it should be a `<button>` with an `onClick` handler |
| Click navigates to correct URL | Click a nearby provider → URL changes to `/providers/{provider_id}` (or `push` mock is called with correct path in tests) |
| Non-clickable items remain `<div>` | Amenities and menu items still render as `<div>` elements |
| No regression on existing functionality | All existing tests pass: `npx vitest run src/__tests__/features/providers/ProviderDetailSections.test.tsx` |
| TypeScript compiles | `npm run type-check` passes |
| Support: empty state / loading state / error state | Unchanged — these already handled by existing conditional rendering |
| Accessibility: clickable items keyboard-navigable | `<button>` is focusable and activatable via keyboard natively |
