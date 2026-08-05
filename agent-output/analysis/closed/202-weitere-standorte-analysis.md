---
ID: 202
Origin: 202
UUID: 4e8b1c7a
Status: Planned
---

# 202 — "Weitere Standorte" Guard Condition Analysis

## Changelog

| Date       | Author  | Change         |
|------------|---------|----------------|
| 2026-08-05 | Analyst | Initial draft  |
| 2026-08-05 | Planner | Status → Planned; plan 202-weitere-standorte-fix-plan.md created |

---

## Value Statement and Business Objective

The provider detail page must only display the "Weitere Standorte" (Further Locations) accordion when a provider has more than one location. Showing it for single-location providers is misleading UI noise — a user sees an expandable section labelled "Further Locations" that, when opened, contains only the current location. The fix is a 1-character guard change.

---

## Context

- **Bug URL**: `/providers/33084ad8-72a0-42d2-b6ef-ff5065709d5d`
- **Offending element**: `<div id="standorte-section">` wrapping `<ExpandSection title="Weitere Standorte">`
- **Branch**: `session/202-weitere-standorte-fix`

---

## Methodology

Direct code inspection via grep and file read. All five investigation goals converted to L1 Proven findings in one pass. No ambiguity required — the guard condition is a single expression directly readable in source.

---

## Findings

### Finding 1 — Component file

| Attribute | Value |
|-----------|-------|
| Confidence | **L1 Proven** — direct code inspection |
| File | `src/features/providers/components/ProviderDetailSections.tsx` |
| Line | 287 |

The "Weitere Standorte" section is rendered inside `ProviderDetailSections` (a `'use client'` component). No other file renders this section — confirmed by workspace-wide grep returning exactly one match.

---

### Finding 2 — Data shape

| Attribute | Value |
|-----------|-------|
| Confidence | **L1 Proven** — type definition + call sites inspected |
| Prop | `locations?: Location[]` |
| Type | `Location[]` — array of `Location` from `src/types/location.ts` |
| Passed by | `ProviderDetailPage.tsx` (lines 544, 908) and `ProviderDetailModal.tsx` (line 688) |

`Location` shape:
```ts
interface Location {
  location_id: string;
  provider_id: string;
  location_name: string | null;
  address_city: string | null;
  is_primary: boolean;
  // ... (address, coords, opening_hours, contact)
}
```

Both callers derive `locations` from `(provider.locations as Location[] | undefined) || []`. This is the **full** locations array for the provider — it includes the primary location and any additional locations. It is never pre-filtered before being passed to `ProviderDetailSections`.

---

### Finding 3 — Guard condition (root cause)

| Attribute | Value |
|-----------|-------|
| Confidence | **L1 Proven** — exact line read |
| File | `src/features/providers/components/ProviderDetailSections.tsx` |
| Current guard (line 287) | `{(locations?.length ?? 0) > 0 && (` |
| Correct guard | `{(locations?.length ?? 0) > 1 && (` |

**Why it is wrong**: The condition renders the "Weitere Standorte" section when there is ≥ 1 location. But "Weitere" means *further/additional* — the section only makes sense when there are 2+ locations (at least one beyond the current/primary). With a single-location provider the section opens to show exactly that one location, which is the same one already displayed in the page header.

**Fix**: Change `> 0` to `> 1` at line 287. Single-character change.

**Truth table**:

| `locations` | Old guard (`> 0`) | New guard (`> 1`) |
|-------------|-------------------|-------------------|
| `undefined` | `false` — hidden ✅ | `false` — hidden ✅ |
| `[]` (empty) | `false` — hidden ✅ | `false` — hidden ✅ |
| 1 location  | `true` — **shown ❌** | `false` — hidden ✅ |
| 2+ locations | `true` — shown ✅ | `true` — shown ✅ |

---

### Finding 4 — Earliest safe short-circuit point

| Attribute | Value |
|-----------|-------|
| Confidence | **L1 Proven** |

The guard is already at the correct level — the JSX conditional in `ProviderDetailSections.tsx` at line 287. Moving it to the callers (`ProviderDetailPage`, `ProviderDetailModal`) would be premature and would violate the single-responsibility principle: the section component itself should own its render condition. No change needed in the callers.

---

### Finding 5 — Related components

| Attribute | Value |
|-----------|-------|
| Confidence | **L1 Proven** — workspace grep confirms single render site |

No other component renders "Weitere Standorte". Both callers (`ProviderDetailPage` and `ProviderDetailModal`) pass `locations` down to `ProviderDetailSections` and do not render the section themselves. The fix at line 287 covers both callers automatically.

---

## Root Cause (L1 Proven)

The guard condition at line 287 of `ProviderDetailSections.tsx` uses `> 0` (non-empty check) instead of `> 1` (multi-location check). Because `locations` contains the full provider locations array — including the primary/current location — a single-location provider satisfies `> 0` and the section renders incorrectly.

---

## Recommended Fix Scope

| # | File | Line | Change |
|---|------|------|--------|
| 1 | `src/features/providers/components/ProviderDetailSections.tsx` | 287 | `> 0` → `> 1` |

No other files need modification.

---

## Testing Gap

No existing tests cover the "Weitere Standorte" section. Two regression tests are needed (to be defined by Planner):

1. **[pre-fix behaviour]** Single-location provider → section must NOT render
2. **[happy path]** Two-location provider → section MUST render

Test file: `src/__tests__/features/providers/ProviderDetailSections.test.tsx` (already exists, append new `describe` block).

---

## Risks & Edge Cases for Planner

| Risk | Severity | Notes |
|------|----------|-------|
| `locations` is `undefined` at render time | None | Guard handles via `?.length ?? 0` — evaluates to `0 > 1` → `false` |
| `locations` is an empty array | None | `0 > 1` → `false` — correctly hidden |
| Provider with exactly 2 locations | None | `2 > 1` → `true` — correctly shown |
| The section renders all locations including primary | Low | A secondary UX concern (showing the current location as a selectable item in "Weitere" list) — out of scope for this fix; document as a separate ticket if needed |

---

## Remaining Gaps

None. All five investigation goals are L1 Proven.

| # | Unknown | Status |
|---|---------|--------|
| 1 | Component file | ✅ Resolved |
| 2 | Data shape | ✅ Resolved |
| 3 | Guard condition | ✅ Resolved |
| 4 | Earliest short-circuit point | ✅ Resolved |
| 5 | Related components | ✅ Resolved |

---

## Open Questions

None.
