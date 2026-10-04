---
ID: 101
Origin: 101
UUID: 3f8a2c7d
Status: Resolved
---

# Critique 101 — Search "Where" field: onboarding location default + Was/Wo UI parity

| Field | Value |
|---|---|
| Artifact | `agent-output/planning/101-search-location-default.md` |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/159 |
| Reviewed at | 2026-04-24T16:10Z |
| Status | **APPROVED — minor findings, no blockers** |
| Verdict | ✅ APPROVED |

---

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-24T16:10Z | Planner → Critic | Initial review | Plan 101 reviewed; 0 CRITICAL, 0 HIGH, 2 MEDIUM, 3 LOW; verdict APPROVED |

---

## Value Statement Assessment

> *As a user who has already selected my city during onboarding, I want the "Where" search field to be pre-filled with my city when I open the search page, and I want the Where and What fields to look and feel consistent, so that I can start searching immediately without re-entering my location every time.*

| Check | Result | Notes |
|---|---|---|
| Presence | ✅ PASS | User-story format with clear role, want, and benefit |
| Clarity of "So that" | ✅ PASS | "Start searching immediately without re-entering my location" — verifiable by observation; north-star metric explicitly named |
| MPO alignment | ✅ PASS | Reduces friction in discovery → directly supports "Muslims default to UFlow" objective |
| Direct value delivery | ✅ PASS | Value is delivered on first use after implementation; not deferred behind a further plan |

---

## Overview

Plan 101 is a well-scoped, well-researched feature plan for a single-file UI enhancement. The Planner has verified the localStorage storage mechanism from source code (Confidence Level 1 — Proven) and identified the precise gap. The decision record is fully resolved, duration estimates are present, out-of-scope is explicit, and the testing strategy covers the critical regression paths. The plan is suitable for handoff to the Implementer.

---

## Architectural Alignment

- The approach is consistent with the project's client-first localStorage pattern established in `city-selection/page.tsx` and `onboarding-state.ts`.
- Staying in `src/app/(public)/search/page.tsx` with no new services, hooks, or API routes is appropriate for a feature of this size (YAGNI-compliant, KISS-compliant).
- The `SearchBar.tsx` isolation (out of scope) is correct — it is a separate stateful component with its own `SearchProvider` context.
- No Supabase profile column exists to read from, so reading from localStorage is the only viable path. **Confirmed correct** per source analysis.
- The plan correctly avoids touching `SearchProvider.selectedLocation` — keeping the two surfaces decoupled is the right scope boundary.

---

## Scope Assessment

Lean and well-bounded. Five milestones, all logically connected, no feature creep. The explicit out-of-scope list is unusually thorough and will help the Implementer resist scope drift. The `Was` parity section is documented as a reference pattern, not implementation scope — correctly flagged.

---

## Technical Debt Risks

Low. The state refactor (`woQuery` → `woInputQuery` + `selectedWoCity`) is an incremental improvement to existing code. No new abstractions are introduced. One future debt item is noted below under F-LOW-3: `SearchBar.tsx` on `/providers` and `/saved` will still default to no location, creating a cross-surface inconsistency that should be tracked.

---

## Findings

### MEDIUM

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| F-MED-1 | M1 acceptance criteria reference obsolete `woQuery` name | OPEN | M1 ACs (pre-fill, empty fallback) still refer to `woQuery` as the state variable. M3 renames this to `woInputQuery` + `selectedWoCity`. An Implementer reading M1 alone will start with a single state, then M3 forces a refactor. This implicit two-pass sequencing risks inconsistency mid-implementation. | Implementer may implement M1 with `woQuery` then rewrite it at M3, wasting effort. | Update M1 acceptance criteria to reference `selectedWoCity` and `woInputQuery` directly (the split is defined in M3 but needed from M1 onwards). Alternatively, add a note in M1: "Apply M3 state model from the start — see M3 for state naming." |
| F-MED-2 | Hydration guidance is ambiguous for Next.js 15 App Router 'use client' pages | OPEN | The plan offers two hydration-safe options — `useEffect` with mounted guard (safe) and lazy `useState` initialiser (conditional guard). For SSR context this matters, but `src/app/(public)/search/page.tsx` is marked `'use client'`. Under Next.js 15 App Router, client components still have an SSR pass by default (they are pre-rendered on the server and hydrated on the client). The lazy `useState` initialiser `() => typeof window !== 'undefined' ? ... : ''` is the standard guard and is indeed correct — but it produces different output on server (`''`) vs client (city name), which is a hydration mismatch. The `useEffect` approach avoids this by always rendering `''` first then updating. The plan calls both "acceptable" without clarifying the tradeoff, leaving the implementer to choose blind. | Risk of a React hydration mismatch warning in production, or a visible one-frame flash. | Recommend `useEffect` + `useState('')` as the preferred pattern (no hydration mismatch); note that lazy init is technically fine only if the component is configured for client-only rendering (e.g., via `dynamic(() => ..., { ssr: false })`). The plan should designate one approach. |

### LOW

| # | Issue Title | Status | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| F-LOW-1 | Semver target is vague | OPEN | "Next available patch after v0.10.24; confirm at DevOps Stage 1" does not name the version. UFlow plan convention includes the semver target (e.g., `v0.10.25`). | Minor: no operational risk; DevOps will pick the version. Slightly weakens audit trail. | Add a line: "Semver bump: patch (v0.10.25 expected — no breaking changes, no new API surface)." Confirm at DevOps Stage 1 as already noted. |
| F-LOW-2 | Implementation Pointers cross into HOW territory | OPEN | The "Hydration safety", "State initialisation order", and "Regression guard" subsections in Implementation Pointers are prescriptive implementation steps — they describe HOW, not WHAT/WHY. This is a recurring pattern in UFlow plans and is intentional for implementer clarity, but it is a documented Planner constraint violation (Planner = WHAT/WHY). | LOW — the guidance is helpful. Risk: future plans may rely on implementation details that get changed, making the plan stale. | Accept as pragmatic UFlow convention. Flag for awareness. No change required to unblock. |
| F-LOW-3 | Cross-surface location inconsistency not tracked | OPEN | `SearchBar.tsx` (used on `/providers` and `/saved`) defaults to no location after this plan. Users who have an onboarding city will now see it pre-filled in `/search` but not in `/providers` or `/saved`. | Minor UX inconsistency that may generate follow-up reports. | Add an entry to `agent-output/planning/open-actions.md` noting this gap for a future plan (do not add to this plan). |

---

## Unresolved Open Questions

None found. The plan contains no `OPEN QUESTION` markers.

---

## Decision Record Check

All 6 decisions are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions. ✅

---

## Duration Estimates Check

Duration estimates table is present with per-phase estimates and total. ✅

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hydration mismatch flash on first render | Low (client page, but SSR pre-render exists) | Low (cosmetic) | Use `useEffect` approach; see F-MED-2 |
| Stale pre-fill after city change | Very Low | Low (user has × clear button) | Clear button in M3 provides escape hatch |
| Regression in existing city filter on `/search` | Low | Medium (breaks search UX) | Regression tests specified in plan |
| `localStorage` unavailable (private mode, browser blocks) | Very Low | None (falls back to `''`) | Plan's existing `''` fallback covers this |

Overall risk: **LOW**. No migration, no API changes, single-file scope.

---

## Recommendations

1. **Planner: Update M1 acceptance criteria** to reference `selectedWoCity` / `woInputQuery` (or add a cross-reference to M3). This eliminates the two-pass refactor risk. (F-MED-1)
2. **Planner: Designate `useEffect` as the preferred hydration pattern** in the plan. (F-MED-2)
3. **Planner: Add `v0.10.25` (patch) as the expected semver target**. (F-LOW-1)
4. **Implementer (owner): add open-actions entry** for cross-surface location default alignment (SearchBar.tsx on /providers and /saved). (F-LOW-3)

---

## Questions for Planner

1. *(F-MED-1)* Will you update M1 ACs to use the M3 state naming, or add a note directing the Implementer to apply the M3 model from the start?
2. *(F-MED-2)* Can you designate `useEffect` + `useState('')` as the preferred hydration approach to remove implementer ambiguity?

---

## Revision History

| Revision | Changes | Findings Added | Findings Addressed | Status Change |
|---|---|---|---|---|
| Initial (2026-04-24T16:10Z) | First review of Plan 101 | F-MED-1, F-MED-2, F-LOW-1, F-LOW-2, F-LOW-3 | — | OPEN → OPEN (APPROVED) |
