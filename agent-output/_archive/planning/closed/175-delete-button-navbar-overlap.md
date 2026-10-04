---
ID: 175
Origin: 175
UUID: b3e8f5c1
Status: Committed
---

# Plan 175: Delete Button Hidden by Fixed Bottom Bar on Mobile

## Changelog

| Date | Task |
|------|------|
| 2026-06-14 | Initial plan — Fix A from analysis: add bottom margin to delete button wrapper |

## Objective

Add bottom margin to the "Delete Provider" button wrapper so it clears the ~80px fixed bottom footer bar (`ProviderEditForm`'s `reviewFooterActions` footer) on mobile viewports. The footer is `fixed bottom-0 z-50` and overlays the statically-positioned delete button when scrolled to the bottom of the page.

## Files to Modify

1. `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` — line 366, the delete button wrapper `div`

## Implementation Steps

### Step 1: Add bottom margin to delete button wrapper

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:366`

**Current**:
```tsx
<div className="mt-8 border-t border-neutral-200 pt-6">
```

**After**:
```tsx
<div className="mt-8 border-t border-neutral-200 pt-6 mb-[calc(5rem+env(safe-area-inset-bottom))]">
```

**Rationale**: `5rem` = 80px covers the fixed footer's content height (16px pt + 48px button + 16px pb ≈ 80px). `env(safe-area-inset-bottom)` ensures it works on devices with a bottom home indicator (iPhone X+). No other changes needed.

No other files need modification. The fix is a single class addition on one element.

## TDD Requirements

None. This is a pure spacing fix — no logic changes. Existing tests should continue to pass. No new test needed for a CSS-only change.

## Verification

1. **Mobile viewport (390px)**: Open the admin edit page, scroll to the bottom. The "Delete Provider" button should be fully visible above the fixed bottom bar, with ~8px gap between the button's bottom edge and the fixed bar's top edge.
2. **Desktop viewport**: The fixed bar still shows (in admin context), the delete button should still clear it comfortably since desktop viewports have more vertical space.
3. **iPhone X+ (safe area)**: Test on a device with a bottom home indicator to ensure `env(safe-area-inset-bottom)` works correctly (the margin adapts automatically).
4. **Non-admin context**: The delete button and the `main` container are only on the admin edit page. No other pages affected.

## Risks

| Risk | Mitigation |
|------|-----------|
| `env(safe-area-inset-bottom)` not supported | Falls back to `5rem` (80px) which is sufficient on most devices since the footer is ~80px. No degradation. |
| Over-margin on long pages | The delete button is the last element before `RejectModal`/`DeleteProviderModal` modals. Extra margin below it is harmless on long pages. |
| The fixed footer height changes in the future | If the footer's content/padding changes, this margin needs updating. Add a comment referencing the dependency. |

### Changelog
| Date | Agent | Action |
|------|-------|--------|
| 2026-06-14 | DevOps | Document closed | Status: Committed |
