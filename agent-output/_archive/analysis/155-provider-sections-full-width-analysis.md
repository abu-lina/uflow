---
ID: 155
Origin: 155
Status: Active
---

# Analysis: ProviderDetailSections Accordions Not Taking Full Width

## Value Statement & Objective

Identify why accordion sections inside `ProviderDetailSections` do not fill the full available width on the provider detail page, and determine the correct fix.

## Context

- **Bug**: Accordion `ExpandSection` cards inside `ProviderDetailSections` do not span full width of their parent container
- **Current HTML**: `<div class="space-y-3">` (outer wrapper of ProviderDetailSections, line 213)
- **Expected HTML**: `<div class="flex flex-col items-start justify-start gap-8 self-stretch">`
- **Viewports affected**: Provider detail page on both mobile and desktop paths
- **Rendered at**:
  - Mobile: `src/components/providers/ProviderDetailPage.tsx` line 540
  - Desktop: `src/components/providers/ProviderDetailPage.tsx` line 905

## Methodology

- Static code analysis of three files and supporting CSS/tailwind config
- DOM tree tracing through both mobile and desktop render paths
- CSS behavior analysis for block, flex, and grid formatting contexts
- Confidence levels: Proven / Observed / Expected / Inferred

## Findings

### Finding 1 (Proven — code structure): Current wrapper at the exact location

**File:** `src/features/providers/components/ProviderDetailSections.tsx`
**Line:** 213

```tsx
return (
  <div className="space-y-3">      {/* <-- LINE 213: current wrapper */}
    <ExpandSection ...>            {/* Values & Amenities */}
    <ExpandSection ...>            {/* Menu/Offers */}
    <ExpandSection ...>            {/* Opening Hours */}
    <ExpandSection ...>            {/* Proof Tier */}
    {locations?.length > 0 && <ExpandSection ... />}  {/* Locations */}
    <TrustBadgesSection ... />     {/* NOT wrapped in ExpandSection */}
    <ExpandSection ...>            {/* Nearby */}
  </div>
);
```

The wrapper uses `space-y-3` which generates `& > * + * { margin-top: 0.75rem; }`. This is pure vertical spacing -- it imposes no width behavior on itself or its children.

### Finding 2 (Proven — code structure): ExpandSection outer div

**File:** `src/components/ui/ExpandSection.tsx`
**Line:** 46

```tsx
<div className="rounded-2xl bg-background shadow-sm">
  <button className="flex w-full items-center justify-between p-4">
  {isOpen && (
    <div className="border-t border-border-light px-4 pb-4">
```

The outer element is a plain `<div>` -- `display: block` by default. It has no `w-full` class. It relies entirely on the block formatting context to fill its parent's width. The button inside has `w-full`, but the outer div does not. The content panel also lacks `w-full`.

### Finding 3 (Proven — DOM tree): Parent context on mobile

**File:** `src/components/providers/ProviderDetailPage.tsx`, line 540

DOM chain (mobile path):
```
div.bg-gradient-to-b.from-[#f5f5f5].to-[#fbfbfb]
  div.pb-24                                       <- block
    div.mx-6.mt-4.space-y-4                       <- block, horizontal margins 1.5rem
      div.space-y-3                                <- ProviderDetailSections wrapper (line 213)
        div.rounded-2xl.bg-background.shadow-sm   <- ExpandSection
        div.rounded-2xl.bg-background.shadow-sm   <- ExpandSection
        ...
```

All ancestors are `display: block`. Block-level children fill 100% of their containing block naturally. **In this chain, `div.space-y-3` does fill width correctly** because the block formatting context propagates full width.

### Finding 4 (Proven -- DOM tree): Parent context on desktop

**File:** `src/components/providers/ProviderDetailPage.tsx`, line 905

DOM chain (desktop path):
```
div.max-w-7xl.px-4.py-8                          <- block, centered, horizontal padding
  div.grid.grid-cols-1.gap-8.lg:grid-cols-2       <- grid container
    div.space-y-6                                  <- RIGHT COLUMN: block, grid item
      div.rounded-2xl.bg-white.p-6.shadow-sm      <- Provider Info Card
      ...                                          <- Barakah, Supporters cards
      div.space-y-3                                <- ProviderDetailSections wrapper (line 213)
        div.rounded-2xl.bg-background.shadow-sm   <- ExpandSection
        ...
```

`div.space-y-6` is a block element inside a grid cell. Block elements in grid cells fill the cell width as if they were in a block formatting context. `div.space-y-3` is a child of this block -- again, it fills naturally. **In this chain too, `div.space-y-3` fills width correctly.**

### Finding 5 (Expected -- CSS behavior): What `self-stretch` actually does

`self-stretch` in Tailwind generates `align-self: stretch`. This property has effect **only** when the element is a flex item (direct child of `display: flex`) or a grid item (direct child of `display: grid`).

In both current parent contexts (mobile `div.space-y-4`, desktop `div.space-y-6`), the parent is `display: block`. `align-self: stretch` on a block-level child of a block container has **no effect**. The child already fills width because of block formatting context rules.

For `self-stretch` to do something meaningful, either:
- The parent (`div.space-y-6` or `div.space-y-4`) needs to become `display: flex` / `display: grid`, OR
- `ProviderDetailSections` is rendered elsewhere in a flex/grid parent that we are not seeing in this analysis

### Finding 6 (Expected -- CSS behavior): The `items-start` contradiction

The expected classes include `items-start`, which is `align-items: flex-start`. In a `flex-col` container, `align-items` controls the cross-axis (horizontal). `flex-start` means children cluster at the left edge and **do not stretch** to full width -- they shrink to their content's intrinsic width.

If line 213 becomes:
```tsx
<div className="flex flex-col items-start justify-start gap-8 self-stretch">
```

Then:
1. The wrapper stretches itself to full parent width (via `self-stretch`, if parent is flex/grid, or via default block behavior otherwise)
2. But the children (ExpandSections, TrustBadgesSection) become flex items with `align-self: flex-start`, meaning they **shrink to content width** -- the opposite of full width

This directly contradicts the stated goal. The `items-start` class would need to be removed (or changed to `items-stretch`) for children to fill width in a flex context.

### Finding 7 (Observed -- spacing delta): `space-y-3` vs `gap-8`

| Property | Current | Expected | Difference |
|----------|---------|----------|------------|
| Gap between cards | `0.75rem` (12px) | `2rem` (32px) | +20px |
| Mechanism | Margin (`space-y-3`) | Gap (`gap-8`) | Flex-compatible |

The 20px spacing increase may be part of the reported issue -- if cards are packed too closely, they may visually appear to not be independent full-width cards, especially when interleaved with the differently-styled `TrustBadgesSection` which has `bg-white p-4 shadow-sm` while ExpandSections have `bg-background shadow-sm` (no horizontal padding at the outer level).

### Finding 8 (Inferred): Root cause hypothesis

The structural analysis shows that in the current block-formatting contexts (both mobile and desktop), the wrapper and its children **do** fill the available width. There is no pure-CSS width bug in the current code paths.

The most likely root causes, in descending order of probability:

1. **Spacing/perception issue (most likely)**: The `space-y-3` (12px) gap between accordion sections is tight enough that adjacent card shadows/borders blend together visually, making sections appear narrower than the independently-spaced cards above them (which use `space-y-6`/`space-y-4` -- 24px/16px). The fix to `gap-8` (32px) would create breathing room, making each card visually distinct and "full width."

2. **Missing width enforcement on ExpandSection outer div**: The ExpandSection's root `<div>` lacks `w-full`. While block-level elements fill width in a block context by default, adding `w-full` would be a defensive measure that survives refactors where the parent becomes flex or grid. The ProviderDetailSections wrapper also lacks `w-full` or `self-stretch`.

3. **Defensive layout flexibility**: If `ProviderDetailSections` is or will be used in flex/grid contexts elsewhere (e.g., if the parent `div.space-y-6` is refactored to `flex flex-col` for consistency), the current code would break because `space-y-3` does not work in flex contexts (it generates margins, not flex gaps). Migrating to `flex flex-col gap-8` would make the component resilient.

## Location of Fix

**Primary file:** `src/features/providers/components/ProviderDetailSections.tsx`
**Line:** 213

Change from:
```tsx
<div className="space-y-3">
```

To the recommended fix (see below -- adjusted from the user's proposed classes).

**Secondary file (defensive):** `src/components/ui/ExpandSection.tsx`
**Line:** 46

Add `w-full` to the root div:
```tsx
<div className="w-full rounded-2xl bg-background shadow-sm">
```

## Viewport Assessment

| Viewport | Affected | Evidence |
|----------|----------|----------|
| Mobile (< 1024px) | Yes -- visually | 12px gap between cards makes them less distinct; `mx-6` parent may compress width perception |
| Desktop (>= 1024px) | Yes -- visually | Same spacing issue; cards nested in grid cell may appear narrower than full-width grid items above |
| Both | Structural fragility | Missing `w-full` / `self-stretch` means any parent refactor to flex/grid breaks width |

## Recommended Fix Approach

### Option A (Recommended -- addresses the real issue)

Replace `space-y-3` with a flex-based layout that enforces both spacing and width, while removing the contradictory `items-start`:

```tsx
<div className="flex flex-col gap-8 self-stretch">
```

- `flex flex-col` -- establishes flex container (gap works, children become flex items)
- `gap-8` -- 32px spacing between accordion sections (matches expected, works in flex)
- `self-stretch` -- defensive: wrapper stretches to parent width even if parent is flex/grid with non-stretch alignment
- **No `items-start`** -- omits it because it would prevent children from stretching

Also add `w-full` to `ExpandSection`'s root div at line 46 of `ExpandSection.tsx`.

**Rationale**: This fix is resilient to parent context changes, provides proper spacing, and does not introduce the `items-start` contradiction. The `self-stretch` handles the width concern without breaking inner layout.

### Option B (Minimal -- if user's expected fix is non-negotiable)

Use the user's exact expected classes but acknowledge the `items-start` side effect:

```tsx
<div className="flex flex-col items-start justify-start gap-8 self-stretch">
```

Then each inner ExpandSection must also get `self-stretch` or `w-full` to counteract `align-items: flex-start`:

```tsx
// ExpandSection.tsx line 46
<div className="w-full rounded-2xl bg-background shadow-sm">
```

**Risk**: This creates a brittle coupling -- every future child of ProviderDetailSections must remember to add `w-full`. A new child that forgets would not be full width.

### Option C (Conservative -- keep block layout, add defensive width)

Keep the block layout but add defensive width classes:

```tsx
<div className="w-full space-y-3">
```

Or increase the gap:
```tsx
<div className="w-full space-y-6">
```

**Limitation**: `space-y-*` does not work in flex or grid contexts; a future parent refactor would silently break. This option does not address the long-term fragility.

### Recommendation

**Choose Option A.** It:
- Addresses the spacing concern (12px -> 32px)
- Ensures full width via `self-stretch` (defensive against parent context changes)
- Uses `gap` instead of margins (works in flex/grid)
- Avoids the `items-start` contradiction
- Adds `w-full` to ExpandSection root as a belt-and-suspenders measure

## Confidence Levels

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Current wrapper is at line 213 of ProviderDetailSections.tsx | Proven | Code structure (Finding 1) |
| Block parents on both mobile/desktop cause natural full-width fill | Proven | DOM tree trace (Findings 3, 4) |
| `self-stretch` is inert in current parent contexts | Expectation | CSS spec: `align-self` requires flex/grid parent (Finding 5) |
| `items-start` would prevent children from stretching | Expected | CSS spec: `align-items: flex-start` overrides default `stretch` (Finding 6) |
| Visual/perceptual issue from tight spacing is primary cause | Inferred | No structural width bug found; spacing delta is the only concrete difference (Finding 7, 8) |
| Option A is the correct fix | Expected | Addresses all concerns without introducing contradictions |
