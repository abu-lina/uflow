---
ID: 188
Origin: 188
UUID: a7f3c2b1
Status: Active
---

# Analysis: Oversized Approve/Reject Buttons on Mobile — ProviderCard Moderation Mode

## 1. Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-18 | Analyst | Initial analysis — handoff to Implementer |

## 2. Value Statement

Admins reviewing pending listings on mobile need a usable UI. The full-width, 48px-tall Approve/Reject buttons dominate each card on narrow screens, wasting vertical space and making it harder to scan listings. This degrades the moderation workflow on the primary mobile use case.

## 3. Context

**Bug**: On `https://ummahflow.com/food?status=pending&section=food`, provider cards displayed in moderation mode show oversized Approve and Reject buttons that dominate the card on mobile.

**Component**: `src/components/providers/ProviderCard.tsx`
**Parent grid**: `src/components/providers/SearchResultsList.tsx`
**Test file**: `src/__tests__/components/ProviderCard.test.tsx`

**Reported by**: User says the buttons "should be removed" on mobile.

## 4. Methodology

- File inspection of `ProviderCard.tsx` (lines 544–586).
- Review of `Button.tsx` component variants and sizing.
- Review of parent grid layout in `SearchResultsList.tsx`.
- Checked test coverage in `ProviderCard.test.tsx`.
- Searched for existing responsive handling of moderation buttons.

## 5. Findings

### 5.1 Button code location

**File**: `src/components/providers/ProviderCard.tsx:544-586`

```tsx
{!hideActions && (
  <div className="flex w-full gap-3.5">
    {/* Plan 058: Moderation Mode - Show Approve/Reject buttons for admin review */}
    {mode === 'moderation' ? (
      <div className="flex w-full gap-2">
        <Button
          aria-label="Approve"
          className="h-12 flex-1 items-center justify-center gap-1.5"
          // ...
          variant="primary"
        >
          Approve
        </Button>
        <Button
          aria-label="Reject"
          className="h-12 flex-1 items-center justify-center gap-1.5"
          // ...
          variant="danger"
        >
          Reject
        </Button>
      </div>
    ) : null}
  </div>
)}
```

### 5.2 Button dimensions

- `h-12` = **48px** tall (`size="default"` in Button also defaults to `h-12`).
- `flex-1` makes each button fill **50% of the card width**.
- Both buttons together fill **100% of the card width** in a `flex w-full gap-2` container.

### 5.3 Parent grid on mobile

From `SearchResultsList.tsx:137`:

```tsx
<div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
```

On mobile (default, no breakpoint), cards are in a **2-column grid** with `gap-3` and `px-4`. Each card is roughly 47vw wide. This means the Approve/Reject button group takes up significant vertical space relative to the card content.

### 5.4 Lack of responsive handling

- The button container has **no responsive Tailwind classes** (no `hidden`/`flex` or breakpoint modifiers).
- The `hideActions` prop exists but is a boolean flag, not responsive-aware.
- No existing mechanism hides moderation buttons on mobile.

### 5.5 Test coverage

Existing tests in `src/__tests__/components/ProviderCard.test.tsx:652-823` cover:
- Moderation buttons not shown in bookmark mode
- Moderation buttons visible in moderation mode
- Click handlers fire correctly
- Review status badges (approved/rejected)
- Disabled state during review
- No click when disabled

**No tests exist for responsive behavior** (no `sm:` breakpoint variant testing).

## 6. Analysis Recommendations

### Primary recommendation: Hide moderation buttons on mobile via responsive utility

Add `hidden sm:flex` to the moderation button wrapper `<div>` at line 548:

```diff
- <div className="flex w-full gap-2">
+ <div className="hidden w-full gap-2 sm:flex">
```

This removes the button group on screens narrower than 640px (`sm:` breakpoint) while keeping it visible on tablet/desktop where there's enough card width.

**Rationale**:
- Mobile cards are ~47vw with `grid-cols-2` — too narrow for two full-width action buttons.
- The buttons are admin-only actions; admin moderation is primarily a desktop workflow, but even if done on mobile, the card is only for review/scrolling — the actual action should be done on a detail page or via a more compact UI.
- `hideActions` is a general flag used in other contexts (e.g., search results with `hideWebsiteButton`); using it for responsive behavior would couple layout concerns with prop logic.
- The `hidden sm:flex` pattern follows Tailwind best practices and is already used elsewhere in the codebase (the grid breakpoints use the same `sm:` pattern).

### Alternative considered: Compact button variant on mobile

Could use `size="sm"'` (`h-7`) and `text-sm` on mobile via responsive classes, but the user explicitly said the buttons should be **removed** on mobile, not resized.

### Impact on tests

The existing tests render at default viewport size (no `resizeViewport`/`viewport` override). With `hidden sm:flex`, the buttons would still be visible in tests because jsdom's default viewport width is 1024px (above `sm:`). But to be safe, add a test that explicitly verifies buttons are hidden below `sm:` breakpoint. The Implementer should add this.

## 7. Gap Tracking Table

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| 1 | Exact breakpoint threshold for hiding | Resolved | Use Tailwind `sm:` (640px) — matches the grid breakpoint pattern in SearchResultsList |
| 2 | Whether admin users need a mobile alternative action | Open | Out of scope for this bugfix; a follow-up could add a detail-page-level moderation action |
| 3 | Test coverage for responsive variant | Action needed | Implementer should add a viewport-aware test |

## 8. Open Questions

None.
