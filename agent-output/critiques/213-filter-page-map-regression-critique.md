---
ID: 213
Origin: 213
UUID: 9d4a1f3c
Status: OPEN
---

# Critique 213 — Plan: Restore Filter Controls on Mobile Search Page

| Field      | Value                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| Artifact   | `agent-output/planning/213-filter-page-map-regression-plan.md`                 |
| Analysis   | `agent-output/analysis/213-filter-page-map-regression-analysis.md`             |
| Date       | 2026-08-16T18:45Z                                                              |
| Status     | Initial Review                                                                 |
| Verdict    | **APPROVED**                                                                   |

## Changelog

| Date              | Agent  | Request         | Summary                             |
| ----------------- | ------ | --------------- | ----------------------------------- |
| 2026-08-16T18:45Z | critic | Initial review  | APPROVED — 1 LOW finding; no blockers |

---

## Value Statement Assessment

✅ **PASSES.** The user story is well-formed:

> As a mobile user on iPhone SE PWA, I want to see the filter controls when I navigate to `/search?section=food`, so that I can set category, location, and audience criteria before executing a food search.

The "so that" names a concrete, direct benefit (filter access restored). The value is delivered immediately by M1 with no intermediary workarounds. Deferred scope (results map) is clearly separated and does not dilute this statement.

---

## Overview

Plan 213 is a focused, single-file bugfix. Root cause is L1 Proven (Analysis 213). The fix removes `isMobileFoodMapMode` and its supporting dead code from `src/app/(public)/search/page.tsx`, restoring unconditional rendering of the filter accordion. Scope is appropriate and minimal. No new patterns, no new dependencies, no migrations.

---

## Architectural Alignment

✅ The fix aligns with the existing architecture:
- The home page (`RootPageContent.tsx`) correctly owns the map view with a toggle
- The filter-setup page (`/search`) correctly owns filter controls only
- Removing `isMobileFoodMapMode` from `search/page.tsx` makes the concern boundaries explicit: home = discovery map, search = filter config, results = results

The deferred results map (D3) is correctly routed to a future plan. Placing it in Plan 213 would have introduced scope risk for a regression fix that needs to ship quickly.

---

## Scope Assessment

✅ Scope is tight and correct:
- 1 file: `src/app/(public)/search/page.tsx`
- Change is purely subtractive (removal + cleanup)
- All state-machine branches are analyzed (Analysis F8); only `food + mobile` is affected
- `ummah`, `store`, and desktop branches explicitly confirmed unaffected

---

## Technical Debt Risks

Low. The change reduces debt by removing Plan 208's incomplete feature (map mode without filter toggle) from a page it does not belong on. No new debt introduced.

---

## Findings

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| F1 | Incorrect step identified as regression in plan narrative | LOW | Plan section "Intended flow" states "Step 2 is the regression this plan fixes." Step 2 is the navigation from home to `/search`, which Analysis confirmed already works (via `HomeSearchBar` sliders button). The actual regression is Step 3 — filter controls not showing once on `/search`. Milestones correctly target `search/page.tsx`, so implementation is unaffected. | Documentation clarity only; no impact on delivery | Implementer should read from the milestones, not the narrative steps. Planner may correct on next revision if desired; not blocking. |

---

## Questions

None. OQ1 resolved by user. OQ2 correctly noted as out of scope. All decisions resolved or properly deferred.

---

## Risk Assessment

**Low overall risk.** Root cause L1 Proven, single file, subtractive change. On-device UAT is the only validation step that cannot be automated and is appropriately called out in the Validation section.

One implementation guard to note (covered in the plan's Risk table): Implementer must grep for any cross-file usage of `isMobileFoodMapMode` or `mapPins` before removal. The analysis confirms these are page-local, but the Implementer should verify.

---

## Recommendations

1. Proceed to @Implementer with this plan as-is. F1 is documentation-only and does not block.
2. After Plan 213 ships, open Plan 214 to address the results page map+toggle (D3 deferred item). The user has explicitly described this as the desired end state.

---

## Revision History

| Version | Date              | Findings Addressed | New Findings | Status Change |
| ------- | ----------------- | ------------------ | ------------ | ------------- |
| Initial | 2026-08-16T18:45Z | —                  | F1 (LOW)     | OPEN → APPROVED (no blockers) |
