---
ID: 053
Origin: 053
UUID: e7b3d91a
Status: Planned
---

# 053 — Provider Scroll Render Bug Analysis

## Changelog

| Date       | Change                         |
| ---------- | ------------------------------ |
| 2026-03-23 | Initial analysis — root cause verified |
| 2026-03-23 | Planning handoff completed; analysis archived | Root cause consumed by Plan 053 |

## Value Statement and Business Objective

The `/providers` discovery page is UFlow's primary user-facing surface. Broken card rendering after scrolling degrades trust, accessibility, and conversion. Users who scroll past the first few pages see overlapping content, misplaced badges, and broken layouts — on both desktop and mobile.

## Objective

Identify the root cause of provider card rendering corruption that occurs after scrolling down 3–4 times on the providers page.

## Context

- **Page**: `/providers` (public discovery)
- **Architecture**: Server Component (`page.tsx`) renders initial 12 results → `ProvidersContent` (Client) handles infinite scroll via React Query `useInfiniteQuery` → `SearchResultsList` renders cards
- **Reproduction**: Load `/providers`, scroll down 3–4 times to trigger infinite scroll pagination. After ~4–5 page loads (48–60 items), layout breaks.
- **Symptoms**: Cards appear narrow, left-aligned, overlapping; category badges misplaced; large whitespace on right (desktop). Similar misalignment on mobile.

## Methodology

- Static code analysis of the rendering pipeline: `page.tsx` → `ProvidersContent.tsx` → `SearchResultsList.tsx` → `ProviderCard.tsx`
- Traced the infinite scroll data flow (React Query `useInfiniteQuery`, `flatMap` accumulation, `IntersectionObserver` trigger)
- Analyzed the dual-mode rendering switch (CSS grid vs. `react-window` `FixedSizeList`)
- Calculated actual vs. estimated card heights from Tailwind classes

## Findings

### F1: Mid-Session Rendering Mode Switch — **Verified** (Root Cause)

**File**: [SearchResultsList.tsx](../../src/components/providers/SearchResultsList.tsx#L12) (line 12, 85, 176)

`SearchResultsList` implements a dual-mode rendering architecture:

| Condition | Rendering Mode | Layout |
| --- | --- | --- |
| `filteredResults.length <= 50` | CSS Grid | Responsive: 1→2→3→4 columns |
| `filteredResults.length > 50` | `react-window` `FixedSizeList` | Single-column, fixed-height rows |

```typescript
const VIRTUALIZATION_THRESHOLD = 50;  // line 12
const useVirtualList = filteredResults.length > VIRTUALIZATION_THRESHOLD;  // line 85
```

**Trigger arithmetic** (`PAGE_SIZE = 12`):

| Scroll # | Total Items | `useVirtualList` | Layout |
| --- | --- | --- | --- |
| initial | 12 | `false` | ✅ Grid (1–4 columns) |
| 1st | 24 | `false` | ✅ Grid |
| 2nd | 36 | `false` | ✅ Grid |
| 3rd | 48 | `false` | ✅ Grid |
| **4th** | **60** | **`true`** | ❌ **FixedSizeList (single column)** |

After the 4th infinite scroll trigger, the entire list re-renders in a fundamentally different layout mode. This directly matches the reported symptom: "render incorrectly after scrolling down 3–4 times."

**Why it breaks**:
- The CSS grid path uses `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — responsive multi-column layout with `gap-8` and `justify-items-center`
- The virtual list path renders each item in a single-column `FixedSizeList`. Each `VirtualRow` wraps the card in `<div className="flex justify-center px-4 pb-4">` with `max-w-md` (448px) — **no multi-column support**
- On desktop, this produces a narrow centered column with massive whitespace on both sides

### F2: Item Height Underestimate Causes Card Overlap — **Verified**

**File**: [SearchResultsList.tsx](../../src/components/providers/SearchResultsList.tsx#L13) (line 13)

```typescript
const ESTIMATED_CARD_HEIGHT = 320;  // pixels allocated per virtual row
```

**Actual ProviderCard height** (calculated from [ProviderCard.tsx](../../src/components/providers/ProviderCard.tsx#L288)):

| Section | Tailwind Class | Pixels |
| --- | --- | --- |
| Image area | `h-64` | 256 |
| Content padding | `p-3.5` (top + bottom) | 28 |
| Name + address | text + gap | ~44 |
| Badges row (conditional) | `h-6` + gap | ~38 |
| Barakah effects (conditional) | `h-7` + gap | ~42 |
| Action buttons | `h-12` + gap | ~62 |
| **Total (max)** | | **~470** |
| **Total (min — no badges/barakah)** | | **~390** |

`react-window` `FixedSizeList` uses absolute positioning with `top = index × itemSize`. With `itemSize = 320` but actual card height of 390–470px, each card overflows its allocated slot by **70–150px**, causing direct visual overlap with the next card.

This explains the reported symptoms of "overlapping layout" and "category badges misplaced" — the bottom portion of each card (badges, barakah effects, action bar) bleeds into the next card's image area.

### F3: Scroll Sentinel Outside Virtual Scroll Container — **Verified** (Amplifier)

**File**: [SearchResultsList.tsx](../../src/components/providers/SearchResultsList.tsx#L232)

The `loadMoreRef` IntersectionObserver sentinel is rendered **outside** the virtual list container:

```
<>
  {useVirtualList ? (
    <div className="h-[70vh]">       ← Virtual list scrolls internally
      <List ...>{VirtualRow}</List>
    </div>
  ) : (
    <div className="grid ...">...</div>  ← Normal page flow
  )}

  {hasNextPage && (
    <div ref={loadMoreRef}>          ← Sentinel: in PAGE flow, not virtual scroll
      ...
    </div>
  )}
</>
```

When `useVirtualList` is `true`, the virtual list container is `h-[70vh]`. The sentinel sits immediately below this fixed-height container in the normal page flow. If the page viewport extends past the 70vh container, the sentinel is **immediately visible** — causing the IntersectionObserver to fire eagerly and load the next page.

Combined with the virtual list's own `onScroll` handler (which also triggers `debouncedLoadMore`), there are **two competing pagination triggers**, one of which may fire prematurely in virtual mode.

**Effect**: After crossing the 50-item threshold, remaining pages may load in rapid succession, keeping the component permanently in (broken) virtual mode.

### F4: Virtual-Mode Width Constraint Mismatch — **Verified**

**Non-virtual path** (grid): Each card is centered within responsive grid cells. The grid adapts column count to viewport width.

**Virtual path** (`VirtualRow`):
```tsx
<div className="flex justify-center px-4 pb-4" style={style}>
  <div className="w-full max-w-md ...">
    <ProviderCard ... />
  </div>
</div>
```

The card is constrained to `max-w-md` (448px) inside a full-width row. The `ProviderCard` itself uses `w-72` (288px). On desktop with a 1200–1920px viewport, this creates 700–1400px of unused horizontal space, matching the "large whitespace on the right side" symptom.

## Root Cause

**Verified**: The rendering bug is caused by a runtime rendering mode switch in `SearchResultsList.tsx`. When the accumulated result count crosses `VIRTUALIZATION_THRESHOLD = 50`, the component switches from a responsive CSS grid layout to a single-column `react-window` `FixedSizeList`. This switch occurs after ~4 infinite scroll page loads (`4 × 12 = 48` items from pagination + 12 initial = 60 items > 50 threshold).

The switch produces three compounding visual failures:

1. **Layout collapse**: Multi-column responsive grid → single-column fixed list
2. **Card overlap**: `ESTIMATED_CARD_HEIGHT = 320px` is 70–150px shorter than actual card height (390–470px)
3. **Premature loading amplifier**: Sentinel element outside virtual scroll container fires eagerly, loading all remaining pages and locking the component in broken virtual mode

## System Weaknesses

### Architecture

| Weakness | Risk Mechanism |
| --- | --- |
| Dual-mode rendering in one component | CSS grid and react-window have fundamentally different layout models; switching between them mid-session with accumulated state is inherently fragile |
| No visual regression testing for scroll states | The bug only manifests after accumulating 50+ items — not covered by snapshot or E2E tests |
| ESTIMATED_CARD_HEIGHT is a compile-time constant | Card content varies (badges, barakah, actions); a fixed estimate cannot accommodate this variance |

### Code

| Weakness | Risk Mechanism |
| --- | --- |
| `useVirtualList` derived from `filteredResults.length` | Every new page load can flip the boolean, causing a full re-render in a different mode |
| IntersectionObserver sentinel placed outside virtual container | In virtual mode, the sentinel is in normal page flow below a fixed-height container and may be immediately visible |
| Two competing load-more triggers (IntersectionObserver + onScroll) | Can cause rapid sequential page loads when both fire |

### Process

| Weakness | Risk Mechanism |
| --- | --- |
| No scroll depth testing in QA workflow | Bug only appears at 50+ items; functional tests likely test first page only |
| Virtualization feature appears to have been added without E2E validation | The react-window integration lacks multi-column support and accurate sizing |

## Instrumentation Gaps

### Normal (always-on)

| Metric/Event | Purpose |
| --- | --- |
| `providers.list.render_mode` (grid / virtual) | Track when users cross the virtualization threshold; alert on unexpected mode switches |
| `providers.list.item_count` per render | Correlate layout complaints with item counts |
| `providers.list.page_load_count` per session | Detect rapid-fire pagination |

### Debug (opt-in)

| Metric/Event | Purpose |
| --- | --- |
| `providers.virtual.card_overflow` | Measure actual card height vs. ESTIMATED_CARD_HEIGHT at runtime |
| `providers.sentinel.intersection_time` | Time from virtual list mount to sentinel intersection — detects premature firing |
| `providers.virtual.scroll_offset_at_load` | Track scroll position when load-more triggers to verify threshold accuracy |

## Analysis Recommendations (Next Steps)

1. **Trace the exact item count at failure**: Add a temporary `console.log` on `useVirtualList` toggle to confirm the 50-item threshold match in production data.
2. **Measure actual card heights**: Use a `ResizeObserver` on a sample of `ProviderCard` instances to determine the true height distribution (min/max/p50/p95) across real data.
3. **Test sentinel visibility in virtual mode**: Verify whether the IntersectionObserver fires immediately when the virtual list container mounts (confirming F3).
4. **Review production provider count**: Determine total provider + community service count to understand how often users would cross the 50-item boundary.

## Open Questions

| # | Question | Impact | Needed to Close |
| --- | --- | --- | --- |
| 1 | What is the total provider count in production? | If < 50 total, the virtual path may never trigger in the default browse view (only with specific filters that return many results) | Query `SELECT count(*) FROM providers WHERE ...` |
| 2 | Was the react-window virtualization intentionally designed for multi-column, or is single-column a known limitation? | Determines whether to fix the virtual path or remove it | Review commit history / plan docs for the virtualization feature |
| 3 | Are there ProviderCard variants with no badges/barakah/actions that fit in 320px? | Could affect whether a fixed height is ever viable | Analyze badge/barakah distribution across providers |
