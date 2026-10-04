---
ID: 108
Origin: 108
UUID: b7e3a91f
Status: Resolved
---

# Critique — Plan 108: Hide Wer Accordion for Stores Section on /search

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Artifact         | `agent-output/planning/108-stores-search-hide-wer-accordion.md`         |
| Analysis         | N/A (no analysis doc)                                                   |
| Date             | 2026-04-27T15:08Z                                                       |
| Review Status    | Revised                                                                 |

## Changelog

| Date               | Handoff              | Request                        | Summary                        |
| ------------------ | -------------------- | ------------------------------ | ------------------------------ |
| 2026-04-27T15:08Z  | Planner → Critic     | Review plan for clarity, completeness, architectural alignment | Initial critique               |
| 2026-04-27T15:15Z  | Critic → Planner     | Revise Finding 1 & 2           | Plan revised; findings resolved |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement is present, uses proper user-story format ("As a … I want … so that …"), is specific to the target persona (store searcher), and the "so that" outcome is directly verifiable in the DOM. The value is delivered directly in this plan — not deferred.

---

## Overview

Plan 108 is a small, focused bugfix that conditionally hides the Wer (audience) accordion when `selectedSection === 'business'` on the `/search` page. The scope is appropriate — a single JSX conditional in one file plus regression tests. The plan correctly identifies the existing pattern (Filter accordion already branches by section) and proposes the same approach.

The plan also identifies the broader problem — the Was? accordion showing food-specific content for stores — and explicitly defers it as a follow-up. This is the right call for scope containment.

---

## Architectural Alignment

**Verdict: ALIGNED**

- Follows the existing section-conditional rendering pattern already used for Filter (UmmahFilterSection vs FilterSection) and Was? (WasServiceTypeResults vs WasCategoryResults).
- No new abstractions, components, or dependencies introduced.
- Pure client-side change in a `'use client'` component — no server/client boundary violation.
- No database changes — correct for this scope.

---

## Scope Assessment

**Verdict: APPROPRIATE**

The plan correctly limits itself to:
1. One conditional render in `page.tsx`
2. Regression tests in `page.test.tsx`
3. Version management (CHANGELOG)

The follow-up recommendation for the Was? accordion is well-documented and correctly out of scope.

---

## Technical Debt Risks

- **Low**: The `werSelection` and `werResetSignal` state continues to be initialized and reset even when the Wer accordion is unmounted for business. This is acknowledged in Decision #3 and is harmless. Not worth addressing now.
- **Medium**: The Was? accordion for stores showing food content (acknowledged in Decision #5 / Follow-Up) is a more visible UX debt. Deferral is appropriate but should be tracked.

---

## Findings

### Finding 1: openAccordion stale state on section switch

| Field          | Value |
| -------------- | ----- |
| Severity       | MEDIUM |
| Status         | RESOLVED |
| Issue          | `openAccordion` is not reset when `selectedSection` changes |

**Description**: The `useEffect` on `selectedSection` (line 377) resets `wasQuery`, `selectedWas`, and `selectedFilters` — but does **not** reset `openAccordion`. If a user has the Wer accordion open (`openAccordion === 'wer'`), then switches to the business section, `openAccordion` remains `'wer'` but the Wer ExpandSection is unmounted. Result: all four (now three) accordions appear collapsed with no visual cue. The user must manually click one to re-open.

**Impact**: Mild UX confusion — user loses their place in the accordion flow on section switch. Not a crash, but inconsistent with the "Was? opens by default" initial state.

**Recommendation**: The plan's Milestone 1 acceptance criteria should include: "When switching to business section, if `openAccordion === 'wer'`, reset `openAccordion` to `'was'` (or `null`)." This can be a one-line addition to the existing section-switch `useEffect`. The Implementer should decide the exact fallback (resetting to `'was'` matches the initial page load behaviour). Note: this is also a pre-existing edge case for ummah→food or food→ummah if future sections hide different accordions, so the fix has forward value.

---

### Finding 2: Test mock hardcodes `section=food` — no coverage path for business

| Field          | Value |
| -------------- | ----- |
| Severity       | LOW |
| Status         | RESOLVED |
| Issue          | Existing test mock for `useSearchParams` always returns `section=food` |

**Description**: The test file's `vi.mock('next/navigation')` hardcodes `useSearchParams: () => new URLSearchParams('section=food')`. The plan's Milestone 2 proposes adding tests for the business section, but the mock must be overridden per-test or per-describe to initialise with `section=business`. The plan doesn't mention this prerequisite.

**Impact**: Low — this is an implementation detail the Implementer will discover. But explicitly noting it in the plan prevents a false start.

**Recommendation**: Add a note in Milestone 2 that the `useSearchParams` mock must be made per-test configurable (e.g., via a module-scoped variable or `vi.mocked()` override) to test business section rendering. This is a standard pattern already used for `enableSearchExpandShowAllPreview` in `FilterSection.test.tsx`.

---

### Finding 3: Missing process note — no `planner.chatmode.md` file found

| Field          | Value |
| -------------- | ----- |
| Severity       | LOW |
| Status         | OPEN |
| Issue          | `.github/chatmodes/planner.chatmode.md` does not exist |

**Description**: Per Critic mode instructions, if the planner chatmode file is absent, record a LOW process note.

**Impact**: None on plan quality. Process tracking only.

**Recommendation**: No action required for this plan. Tracked for process completeness.

---

## Unresolved Open Questions

No `OPEN QUESTION` items found in the plan document.

---

## Duration Estimates Check

**Present**: Yes — the plan includes a Duration Estimates table with phase breakdowns and uncertainty levels. Estimates are reasonable for the scope (1–2 hours total for a single-conditional + tests).

---

## Risk Assessment

The plan's risk table is adequate. The two identified risks (accordion state leak, future section additions) are real and mitigated. Finding 1 above is a more specific manifestation of the first risk that the plan's risk section alludes to but doesn't fully specify the fix for.

Overall risk: **Low**. This is a minimal, well-understood change with clear acceptance criteria.

---

## Recommendations

1. **Address Finding 1** (MEDIUM): Add acceptance criterion to Milestone 1 requiring `openAccordion` reset on section switch when the current accordion is being hidden. One line in the existing `useEffect`.
2. **Address Finding 2** (LOW): Add note to Milestone 2 about `useSearchParams` mock override strategy.
3. Track the Was? accordion follow-up (from plan's own Follow-Up Recommendations) as a separate plan or open-action item.

---

## Verdict

**APPROVED with minor revision requested** — Finding 1 (MEDIUM) should be addressed in the plan before implementation to avoid a predictable UX glitch. Finding 2 (LOW) is advisory. The plan may proceed to implementation once Finding 1's acceptance criterion is incorporated.

**UPDATE 2026-04-27T15:15Z**: Plan revised. Finding 1 and Finding 2 incorporated. **Verdict upgraded to: APPROVED.**

---

## Revision History

_Initial review — no prior revisions._
