---
ID: 091
Origin: 091
UUID: b4e8c3f2
Status: Resolved
---

# Critique: 091 — Home Redesign Increment 2: SectionSelector Visual + /suchen Stub

**Artifact**: `agent-output/planning/091-home-redesign-increment-2-plan.md`
**Date**: 2026-04-17T14:30Z
**Reviewer**: GitHub Copilot (Critic mode)

---

## Changelog

| Date              | Handoff | Request | Summary |
|-------------------|---------|---------|---------|
| 2026-04-17T14:30Z | Planner → Critic | Pre-implementation review | Initial critique — 3 findings (1 MEDIUM, 2 LOW) || 2026-04-17T16:00Z | Critic → Planner | Revision requested | F1 MEDIUM blocking; F2+F3 LOW recommended |
| 2026-04-17T16:00Z | Planner → Critic | Revision applied | All 3 findings addressed; **verdict upgraded to APPROVED** |
---

## Value Statement Assessment

**CLEAR and DIRECT.**

> "As a UFlow mobile user browsing the home screen, I want the section tabs to have a polished teal-pill design and be able to tap the search bar to land on a dedicated search page, so that the discovery surface feels complete, professional, and clearly navigable."

The "so that" clause is explicit: professional visual polish + clear navigation to a dedicated search entry point. Both deliverables serve this directly. No drift detected from the Epic (Discovery UX — Unified Home Screen).

---

## Overview

Plan 091 is a **well-scoped increment** continuing the home redesign arc from Plan 090. It has two tightly defined deliverables — a Tailwind restyle of an existing component and a new shell page — plus one URL change. All decisions are resolved or properly deferred with user attribution. Duration estimates are present.

The plan is structurally sound and respects Planner constraints (WHAT/WHY, no implementation code, explicit scope boundaries). Three findings follow — one requiring Planner attention before implementation begins.

---

## Architectural Alignment

- **New route** `src/app/(public)/suchen/page.tsx`: Correct App Router placement in `(public)` group. Pattern consistent with existing routes. ✅
- **SectionSelector restyle**: Tailwind-only, no prop/structural changes. Zero blast radius to component API. ✅
- **HomeSearchBar URL change**: Single-line change with test update. ✅
- **`useSearchParams()`** on `/suchen`: Required to read `?section=` from URL. In Next.js App Router, `useSearchParams()` in a client component requires a `<Suspense>` boundary in the parent. Plan does not address this. See F1 below.
- **Data flow split**: HomeSearchBar goes to `/suchen`; CategoryGallerySection category clicks still go to `/providers`. Split is intentional and documented in plan. Consistent with design intent. ✅

---

## Scope Assessment

**Tight and appropriate.** Scope boundaries are explicit with a clear out-of-scope list. No gold-plating; no premature implementation of search execution. D3/D4 deferrals are well-documented with user authorization.

One risk worth monitoring (not a blocking finding): as the `/suchen` stub accumulates future increments, the absence of a named SEARCH page plan means the route may evolve without a governing plan ID. Recommend allocating a follow-on plan ID in the backlog when search execution begins. Out of scope for this critique.

---

## Technical Debt Risks

- **`bg-white` hardcoding** (M1): If the codebase ever adopts dark mode, hardcoding `bg-white` on the SectionSelector container will regress. The semantic token `bg-background` is safer. LOW risk today (no dark mode in roadmap), but worth a plan-level note. See F2.
- **`router.back()` on direct navigation** (M2): A deduce-able UX gap — addressed in F1 below.

---

## Findings

### F1 — MEDIUM: `useSearchParams()` requires Suspense boundary; `router.back()` has no history on direct navigation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Section** | M2: /suchen Stub Page |
| **Status** | RESOLVED |

**Issue (Part A — `useSearchParams()`)**: The plan states the `/suchen` page "Reads `?section=` from URL params as initial state." In Next.js App Router, reading URL params in a client component requires `useSearchParams()`. When this hook is used in a component **without a `<Suspense>` boundary in the parent tree**, Next.js throws a build/runtime error in static generation contexts, or at minimum SSR-renders without the param. The plan does not instruct the Implementer to wrap the page (or the param-reading logic) in `<Suspense>`. Since `/suchen` is likely statically optimised by default in the `(public)` group, this is a build-time risk.

**Issue (Part B — `router.back()`)**: The plan says the back button triggers `router.back()`. If a user navigates directly to `/suchen` (e.g., from a notification, a share link, a bookmark), `router.back()` produces no navigation (empty history stack). This leaves the user stranded on the stub page with no visible exit.

**Impact**: Part A → potential build failure or missing section pre-selection on the stub page. Part B → UX dead-end for direct navigation to `/suchen`.

**Recommendation**:
- Part A: Plan should resolve this by specifying either (a) wrap `useSearchParams()` in a `<Suspense>` boundary within the page file, or (b) read section from `searchParams` prop (available on Server Components) — but this conflicts with `useRouter()` being used on the same page, so (a) is the right path. Add to M2 acceptance criteria: "Page renders without Suspense boundary build warning; `?section=` initialises the tab correctly."
- Part B: Plan should specify: if `router.back()` has no history (or as a reliable fallback), navigate to `/` instead. `router.back()` alone is insufficient as the back target. Suggested pattern: `router.back()` only if history is available; fallback `router.push('/')`.

---

### F2 — LOW: M1 instructs `bg-white` raw instead of `bg-background` semantic token

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Section** | M1: SectionSelector Visual Redesign |
| **Status** | RESOLVED |

**Issue**: The M1 implementation guidance lists `bg-white` as the container background. The project's tailwind.config.ts uses semantic tokens (e.g. `bg-background` resolves to `hsl(var(--color-background))`) per the documented naming convention. Using `bg-white` hardcodes the colour value and will not respond to future theme changes.

The plan itself acknowledges the codebase preference for semantic tokens (D5 correctly uses `bg-primary` not `#589d96`) — so `bg-white` is inconsistent with the plan's own D5 principle.

**Impact**: LOW today (no dark mode). Minor inconsistency relative to plan's own token-first guidance (D5). Future theme changes require a manual hunt-and-replace.

**Recommendation**: Replace `bg-white` with `bg-background` (or `bg-surface` if that better matches context) in M1 guidance. Add a note that Implementer should verify the token resolves to white in the current theme.

---

### F3 — LOW: Plan 090 SC5 supersession not explicitly documented

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Section** | Value Statement / Decision Record |
| **Status** | RESOLVED |

**Issue**: Plan 090 has a UAT-approved success criterion SC5: "Tapping into the search bar navigates to `/providers` (existing search results page) with the active section pre-selected." Plan 091 M3 changes this behaviour — HomeSearchBar now goes to `/suchen`. This is a **deliberate supersession of an approved UAT criterion**, but the plan doesn't document it as such. A future reader of Plan 090's UAT report will see SC5 as "PASSED" while the actual behaviour no longer matches.

**Impact**: LOW for implementation (intent is clear). Document hygiene risk — creates a factual inconsistency in the audit trail. If a regression occurs and someone checks Plan 090's UAT report to verify SC5, they will be misled.

**Recommendation**: Add a `D7` decision to Plan 091: "HomeSearchBar target supersedes Plan 090 SC5 — SC5 (`/providers` navigation) is intentionally replaced by `/suchen` navigation as of this increment. Plan 090 UAT report remains valid as a historical snapshot." This protects the audit trail without requiring Plan 090 to be retroactively edited.

---

## Positive Observations

- **Decision record quality is excellent**: All 6 decisions resolved or deferred with full attribution. D3/D4 deferrals correctly identify user as owner, with explicit justification. Follows the Deferred Findings Rule correctly.
- **Scope discipline**: The plan shows clear understanding of the increment. The out-of-scope list pre-empts common over-engineering traps (no suggestion rows, no filter logic, no backend changes).
- **Colour token verification done at planning time**: The Planner verified `#589d96` against `globals.css` and `tailwind.config.ts` before writing the plan — D5 is a model example of planning-time validation.
- **Test update coverage**: Plan explicitly identifies that HomeSearchBar test URL assertions need updating (Assumption 3) and lists the test file in Affected Files. Clean handoff signal.
- **Rollback considerations present**: Rare in plans of this size; good practice.
- **Duration estimates present and calibrated**: 4–5 hours total is reasonable for this scope.

---

## Questions

None. All decisions resolved. F1 and F2 require plan amendments before implementation begins.

---

## Risk Assessment

| Risk | Plan Severity | Critique Assessment |
|------|---------------|---------------------|
| SectionSelector restyle breaks /providers layout | MEDIUM | Agree — mitigated by tests + visual check |
| `bg-primary` HSL mismatch | LOW | Agree — 3-unit hue delta is imperceptible |
| `/suchen` route conflict | LOW | Agree — verified clean |
| `useSearchParams()` Suspense boundary | Not in plan | **MEDIUM** — added as F1 |
| `router.back()` on direct navigation | Not in plan | **MEDIUM** — added as F1 |
| `bg-white` hardcoding | Not in plan | LOW — added as F2 |

---

## Recommendations

Before implementation:

1. **REQUIRED**: Planner to address F1 — add Suspense guidance to M2 and back-navigation fallback spec.
2. **RECOMMENDED**: Planner to address F2 — change `bg-white` to `bg-background` in M1 guidance.
3. **RECOMMENDED**: Planner to address F3 — add D7 documenting supersession of Plan 090 SC5.

F1 is blocking (MEDIUM risk to build correctness). F2 and F3 are amendable at Planner discretion — plan can proceed to implementation with F2/F3 open if Planner judges them acceptable, but they are recommended to address for audit hygiene.

---

## Revision History

| Revision | Artifact Changes | Findings Addressed | New Findings | Status Changes |
|----------|-----------------|-------------------|--------------|----------------|
| Initial  | Plan created     | —                 | F1 MEDIUM, F2 LOW, F3 LOW | Status → OPEN |
| Rev 1    | Plan revised (F1: Suspense boundary + router.back fallback added to M2; F2: bg-background in M1; F3: D7 added) | F1, F2, F3 — all RESOLVED | None | Status → APPROVED |

---

## Verdict

**APPROVED** — All findings resolved. Plan 091 is cleared for implementation.
