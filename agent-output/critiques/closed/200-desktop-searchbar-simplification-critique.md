---
ID: 200
Origin: 200
UUID: b7a2d1f4
Status: Resolved
---

# Critique: Plan 200 — Desktop Search Bar Simplification

| Field | Value |
|-------|-------|
| Artifact | `agent-output/planning/200-desktop-searchbar-simplification.md` |
| Date | 2026-08-02T21:10Z |
| Status | Initial |
| Verdict | **APPROVED** |

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-08-02T21:10Z | Planner → Critic | Review Plan 200 | Reviewed. APPROVED with 1 LOW advisory. No blockers. |

---

## Value Statement Assessment

**Present**: Yes — clear user story with "so that" clause.
**Quality**: Good. Directly addresses product owner's reported UX concern (cluttered bar). Aligns with master objective (frictionless discovery).

---

## Overview

Plan 200 is a low-risk UI refactor that relocates secondary search controls (Wer, Filter) from the desktop search bar into a pill row below it. No logic changes, no API changes, no DB changes. Pure CSS/JSX restructure scoped to desktop breakpoint only.

---

## Architectural Alignment

**Aligned**. The plan:
- Keeps all state in the same component (`SearchBarContent`) — no new state management
- Does not introduce new components that duplicate logic (D6)
- Respects the existing separation between desktop `SearchBar` and mobile `HomeSearchBar`/accordion
- No external service additions (consistent with Postgres-first philosophy — N/A here but no drift)

---

## Scope Assessment

**Appropriate**. The plan is surgical:
- 1 primary file modified (`SearchBar.tsx`)
- 1 secondary file modified (`Header.tsx` — potentially, for container structure)
- i18n keys for 1 new label across 6 locale files
- No new dependencies, no new components extracted (pills are inline in same component)

M1–M3 could arguably be a single milestone (they're all part of one visual restructure), but the separation provides clear acceptance criteria checkpoints. Acceptable.

---

## Technical Debt Risks

**None introduced**. This plan reduces visual debt (removes cluttered 4-in-1 bar pattern) without introducing architectural debt. The component stays monolithic (same file), which is the right call for a purely visual change that doesn't warrant extraction.

---

## Findings

### LOW

| # | Issue | Status | Description | Impact | Recommendation |
|---|-------|--------|-------------|--------|----------------|
| F1 | Mobile behavior assumption needs verification | RESOLVED | Plan states "Mobile layout unchanged (Wer/Filter still in-bar on mobile, or hidden if mobile uses accordion)" — the "or" indicates uncertainty. From code review, the same `SearchBar` component renders on both desktop and mobile in `Header.tsx`. The mobile experience uses the same component but at a narrower width. | If implementer doesn't guard properly, mobile could lose Wer/Filter access. | Implementer should verify: on mobile, Wer and Filter must remain accessible (either in-bar or via the existing `HomeSearchBar` accordion on the root page). Add a responsive breakpoint guard (`hidden md:flex` for pill row, show inline for mobile). |

---

## Questions

None. The plan is clear, scoped, and all decisions are resolved.

---

## Risk Assessment

| Risk Area | Assessment |
|-----------|------------|
| Scope creep | Low — plan is tightly bounded to visual restructure |
| Regression | Low — behavioral tests assert search/location/filter functionality, not DOM layout |
| Architectural drift | None — stays within existing component boundaries |
| Timeline | Low — 2–3h estimate is realistic for CSS/JSX restructure |

---

## Recommendations

1. Implementer should add a brief responsive test: confirm Wer/Filter are accessible on mobile viewport (either inline or via alternative path).
2. Consider merging M1+M2+M3 into a single implementation pass since they modify the same ~50 lines of JSX — keeping them as separate acceptance-criteria checkpoints is fine, but they don't need separate commits.

---

## Duration Estimates Check

**Present**: ✅ Required section is included with per-phase breakdowns.
**Reasonable**: Yes — 2–3h total for a CSS/JSX refactor with no logic changes is realistic.

---

## Decision Record Check

- No decisions marked `[OPEN]` ✅
- No decisions marked `[DEFERRED]` ✅
- All 6 decisions RESOLVED with rationale ✅

---

## Verdict

**APPROVED** — Plan is clear, well-scoped, architecturally aligned, and low-risk. One LOW advisory (F1) for the implementer to verify mobile behavior. No blockers.
