---
ID: 130
Origin: 130
UUID: b7e3a91d
Status: Resolved
---

# Critique: Plan 130 — Extract Reusable IconListRow Component

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Artifact          | `agent-output/planning/130-icon-list-row-reusable-component.md`    |
| GitHub Issue      | https://github.com/abu-lina/uflow/issues/227                      |
| Date              | 2026-05-12T17:00Z                                                  |
| Status            | **APPROVED**                                                       |

## Changelog

| Date               | Handoff        | Request              | Summary                     |
| ------------------ | -------------- | -------------------- | --------------------------- |
| 2026-05-12T16:53Z  | Planner→Critic | Initial review       | First critique pass         |
| 2026-05-12T17:00Z  | Critic→Planner | Revision request     | F-1/F-2/F-3 addressed by Planner; all findings resolved |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement is clear, follows user-story format, identifies the developer as the beneficiary, articulates the problem (duplication across 3+ files), and states the expected outcome (visual consistency + zero style duplication). The "so that" clause is concrete and measurable.

## Overview

Well-structured refactor plan. The duplication inventory is evidence-based with exact class strings and line references. The decision record is thorough — D3 (presentational-only component) and D4 (sublabel as ReactNode slot) are particularly sound architectural calls. Duration estimates are realistic for a mechanical refactor.

## Architectural Alignment

**Verdict: ALIGNED**

- Component placement in `src/components/ui/` is correct per the [Placement Rubric](docs/guides/PLACEMENT_RUBRIC.md): "UI component (shared across features) → `src/components/ui/`".
- The slot-based API (icon, content, trailing as ReactNode) follows existing `src/components/ui/` patterns (e.g., `ExpandSection`).
- Keeping the component presentational-only (D3) avoids polymorphic `as` prop complexity, which is appropriate for the current scale.

## Scope Assessment

**Verdict: REASONABLE with one gap**

The plan correctly identifies 3 files / 4 render sites. However, the codebase audit reveals **additional consumers** of the identical row pattern that were missed:

| File | Row pattern match | In plan? |
|------|------------------|----------|
| `WasCategoryResults.tsx` | `flex w-full items-center gap-3 rounded-xl px-2 py-2` | Yes |
| `WasServiceTypeResults.tsx` | Same | Yes |
| `AttestationCard.tsx` | Same | Yes |
| `WoCityResults.tsx` (L47) | Same (with minor additions: `focus:outline-none focus:ring-2`) | **No** |
| `FilterSection.tsx` (L80) | Near-identical: `p-2` instead of `px-2 py-2` (equivalent) | **No** |
| `UmmahFilterSection.tsx` (L75) | Icon slot sub-pattern only (different outer layout) | **No** (lower priority) |

See **Finding F-1** below.

## Technical Debt Risks

- **LOW**: Creating a new UI atom increases the component surface area. However, the deduplication benefit (removing ~5 near-identical class strings) clearly outweighs this.
- **LOW**: If the component API bakes in the exact current class string, future Tailwind utility changes will require updating only one file instead of 5+.

## Findings

### F-1: Incomplete Duplication Inventory — `WoCityResults` and `FilterSection` omitted

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Severity        | **MEDIUM**                                                     |
| Status          | RESOLVED                                                       |
| Issue           | The plan identifies 3 files / 4 render sites, but `WoCityResults.tsx` uses the exact same row pattern (L47: `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30`), and `FilterSection.tsx` (L80) uses a near-identical variant (`p-2` = `px-2 py-2`). Both are in the same `src/features/search/components/` directory as the other consumers. |
| Impact          | If only 3 of 5 consumers are refactored, the duplication problem is only partially solved. Future developers may not know `IconListRow` exists and continue hand-rolling the pattern in `Wo` and `Filter` sections. |
| Recommendation  | Add `WoCityResults.tsx` as a Milestone 3b and `FilterSection.tsx` as Milestone 3c. They are in the same feature directory and use the same pattern — including them keeps scope tight while properly eliminating duplication. `UmmahFilterSection.tsx` shares only the icon-slot sub-pattern (not the full row layout) and can reasonably be excluded. Update the "Files Touched" table accordingly. |

### F-2: `className` override mechanism not specified

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Severity        | **LOW**                                                        |
| Status          | RESOLVED                                                       |
| Issue           | The search page rows use `hover:bg-neutral-muted`, `WoCityResults` uses `hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30`, `FilterSection` uses the same focus ring, and `AttestationCard` uses no hover/focus at all. The plan's M1 acceptance criteria say "Row container uses the canonical classes from the search page" but doesn't specify how consumers opt-out of or override these interactive states. |
| Impact          | Without a `className` prop or explicit guidance, the implementer may bake `hover:bg-neutral-muted` into the component and then need to fight it in the attestation card (static, no hover) and `WoCityResults` (different hover color). |
| Recommendation  | M1 acceptance criteria should specify that `IconListRow` accepts an optional `className` prop for consumer-level overrides (hover states, focus rings), OR that interactive states (hover, focus, transition) are NOT part of the component's base classes — consumers add them on their wrapping `<button>`/`<div>`. Given D3 (presentational-only), the latter approach is cleaner: keep only layout classes in `IconListRow`, let the wrapper handle interaction styles. Clarify this in M1. |

### F-3: `'use client'` directive may be unnecessary

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Severity        | **LOW**                                                        |
| Status          | RESOLVED                                                       |
| Issue           | M1 acceptance criteria state `'use client'` directive is required "because consumers use hooks." However, the component itself is described as purely presentational with no hooks. A presentational component that accepts ReactNode slots doesn't need `'use client'` — it can be a shared component rendered by both server and client components. |
| Impact          | Minor. Adding `'use client'` unnecessarily prevents future server-component consumers, though current consumers are all client components. |
| Recommendation  | Remove the `'use client'` requirement from M1. If the component imports nothing from React beyond types and uses no hooks/state/effects, it doesn't need the directive. Client consumers will still work — the client boundary is at the consumer level. |

### F-4: Process note — missing planner chatmode file

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Severity        | **LOW**                                                        |
| Status          | OPEN                                                           |
| Issue           | `.github/chatmodes/planner.chatmode.md` does not exist in the workspace. Per Critic instructions, this is recorded as a LOW process note. |
| Impact          | None on this plan. |
| Recommendation  | Create the file when convenient; not blocking. |

## Unresolved Open Questions

None — the plan contains no `OPEN QUESTION` items.

## Decision Record Check

All 4 decisions (D1–D4) are marked `[RESOLVED]` with rationale. No `[OPEN]` or `[DEFERRED]` decisions.

## Duration Estimates Check

**PASS** — Duration Estimates section present with phase breakdown (Implementation: 1–2h, QA: 30m, DevOps: 15m, Total: ~2–3h). Note: if F-1 is addressed (adding 2 more files), the implementation estimate should increase slightly to ~2–3 hours.

## Risk Assessment

The plan's risk table covers the two main risks (token mismatch, selector breakage). One additional risk to consider:

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Merge conflicts if other search-page plans are in-flight | Low | Low | Check active plans before implementation; this is a standalone refactor |

## Recommendations

1. **Address F-1** (MEDIUM): Add `WoCityResults.tsx` and `FilterSection.tsx` to the scope. Same directory, same pattern, minimal additional effort.
2. **Clarify F-2** (LOW): Specify whether `IconListRow` includes interaction styles or only layout, and how consumers override.
3. **Consider F-3** (LOW): Drop `'use client'` from M1 requirements if the component has no hooks.

## Hotfix Scenario Check

**"How will this plan result in a hotfix after deployment?"**

Low risk. This is a pure presentational refactor with no data-layer, auth, or API changes. The most likely hotfix scenario would be a subtle visual regression (e.g., an `ExpandSection` padding interaction causing misalignment on specific viewports). The plan's M5 visual QA milestone and the existing test suites mitigate this adequately. No additional safeguards needed.

---

## Verdict

**APPROVED**

All findings (F-1 MEDIUM, F-2 LOW, F-3 LOW) have been addressed by the Planner revision:
- F-1: `WoCityResults.tsx` and `FilterSection.tsx` added to duplication inventory and scope (M3b, M3c)
- F-2: `IconListRow` API clarified as layout-only; interaction styles passed via `className`
- F-3: `'use client'` requirement removed from M1

F-4 (process note) remains open as a low-priority follow-up. Plan is cleared for implementation.

## Revision History

| Revision | Date               | Findings Addressed | New Findings | Status Changes |
| -------- | ------------------ | ------------------ | ------------ | -------------- |
| Initial  | 2026-05-12T16:53Z  | —                  | F-1 through F-4 | — |
| Rev 1    | 2026-05-12T17:00Z  | F-1, F-2, F-3      | None         | Verdict: APPROVED |
