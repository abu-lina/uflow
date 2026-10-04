---
ID: 155
Origin: 155
Status: Draft
---

# Plan: ProviderDetailSections Accordions Full Width Fix

## 1. Summary

Accordion sections (`ExpandSection` cards) inside `ProviderDetailSections` don't visually span the full width of their parent container. The analysis identified two contributing issues:

1. **Tight spacing (primary cause)**: `space-y-3` (12px gap) between cards makes adjacent shadows/borders blend, so cards _appear_ narrower than they actually are. Moving to `gap-8` (32px) creates visual breathing room.
2. **Missing width enforcement (defensive)**: `ExpandSection`'s root `<div>` lacks `w-full`, so if the parent context ever changes from block to flex/grid, cards would shrink to content width.

The fix adopts **Option A** from the analysis: migrate to flex-based layout with proper gap, add `self-stretch` on the wrapper, and add `w-full` on `ExpandSection` root.

## 2. Changes

### Change 1: ProviderDetailSections.tsx — wrapper div classes

**File:** `src/features/providers/components/ProviderDetailSections.tsx`
**Line:** 213

**Before:**
```tsx
<div className="space-y-3">
```

**After:**
```tsx
<div className="flex flex-col gap-8 self-stretch">
```

**What this does:**
- `flex flex-col` — establishes flex container so `gap` works and children become flex items
- `gap-8` — 32px spacing between sections (was 12px via `space-y-3`)
- `self-stretch` — wrapper stretches to parent width even if parent is flex/grid with non-stretch alignment
- Omits `items-start` (present in earlier proposal) — that would prevent children from stretching full width

### Change 2: ExpandSection.tsx — root div width

**File:** `src/components/ui/ExpandSection.tsx`
**Line:** 46

**Before:**
```tsx
<div className="rounded-2xl bg-background shadow-sm">
```

**After:**
```tsx
<div className="w-full rounded-2xl bg-background shadow-sm">
```

**What this does:**
- Adds `w-full` so the card explicitly fills its parent's width regardless of formatting context
- Belt-and-suspenders measure: ensures the card spans full width even if `align-items` or `justify-items` on a future flex/grid parent would prevent default block stretching

## 3. Testing Strategy

| Check | What to verify | How |
|-------|---------------|-----|
| Build | No TypeScript or build errors | `npm run build` or `npm run type-check` |
| Lint | No lint regressions | `npm run lint` |
| Visual — mobile | All ExpandSection cards fill width; spacing between cards is 32px | Manual browser check at 375px viewport |
| Visual — desktop | Same at >=1024px; cards in right grid column fill full column width | Manual browser check at 1280px viewport |
| Visual — TrustBadgesSection | The non-ExpandSection `TrustBadgesSection` also fills full width and has 32px gap from neighbors | Visual check |
| Visual — no overlap | No unintended horizontal scroll or overflow | Check horizontal scrollbar on both viewports |

No existing tests target these specific classes. The changes are purely CSS — no logic change — so no new test file is required unless test coverage for class name assertions is desired.

## 4. Implementation Order

1. **Edit `ProviderDetailSections.tsx`** line 213 — replace `space-y-3` with `flex flex-col gap-8 self-stretch`
2. **Edit `ExpandSection.tsx`** line 46 — add `w-full` before `rounded-2xl`
3. **Run type-check** — `npm run type-check`
4. **Run lint** — `npm run lint`
5. **Manual visual check** — mobile (375px) and desktop (1280px) on the provider detail page
6. **Commit** (if applicable) with message: `fix: make provider sections full width and increase card gap to 32px`

## 5. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Change 1: `space-y-3` removed, `gap-8` added** — `space-y-3` margins (12px) were applied via `& > * + * { margin-top: 0.75rem; }`, meaning the first child had no top margin. `gap-8` applies to all adjacent children uniformly. This difference is invisible because there is no top margin/padding on the wrapper in either case. | Low | No action needed; visual outcome is identical except for spacing amount. |
| **Change 1: Block → flex changes child layout** — children become flex items. Block children that previously used `margin: auto` for centering may behave differently in a flex context. `ExpandSection` and `TrustBadgesSection` don't use `margin: auto`. | Low | Check all children of ProviderDetailSections for `mx-auto` / `ml-auto` / `mr-auto` patterns. |
| **Change 2: `w-full` on a block div** — redundant in a block formatting context; no negative side effect. | None | It's a no-op in current context; purely defensive. |
| **Spacing increase (12px → 32px) looks too large** on some viewports. | Medium | Verify visually at 375px and 1280px. If excessive, reduce to `gap-6` (24px). |
| **`self-stretch` on a block child of a block parent** — currently inert. If the parent's layout changes, it activates. | Low | Intended behavior — defensive measure for future refactors. |

### Child margin check

Scanned children of the wrapper (`ProviderDetailSections.tsx:214-221`): all `ExpandSection` and `TrustBadgesSection` children use standard layout (flex, grid, or block without auto margins). No `mx-auto`, `ml-auto`, or `mr-auto` found in these children's root elements. No regressions expected from the block-to-flex switch.
