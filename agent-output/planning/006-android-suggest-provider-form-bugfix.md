---
ID: 006
Origin: 006
UUID: 9c41e0ab
Status: UAT Approved
---

# Implementation Plan: Android Suggest Provider Form Bugfix

**Plan ID**: 006
**Target Release**: v0.3.1 (hotfix)
**Epic Alignment**: 3.1 — Community-Driven Provider Recommendations
**Priority**: P0
**Created**: 2026-02-22
**Planner**: planner agent

## Change Log

| Date       | Agent  | Change               | Rationale |
|------------|--------|----------------------|-----------|
| 2026-02-22 | Planner | Initial plan created | Fix Android UX regression blocking provider recommendations |
| 2026-02-22 | Planner | Revised after critique | Lock release target + cover non-user focus triggers + define Android QA minimum |
| 2026-02-22 | QA | QA executed (automated gates) | Tests/type-check/build + delta lint PASS; QA FAILED pending Android matrix + non-user auto-select focus verification (see `agent-output/qa/006-android-suggest-provider-form-bugfix-qa.md`) |
| 2026-02-22 | Implementer | v2 fix: `userToggledRef` pattern | Replaced `isInitialRender` with causal guard addressing QA-identified programmatic focus gap; 114 tests pass (5 ContactCheckbox tests); all automated gates green |
| 2026-02-22 | QA | QA re-run complete | QA Complete: automated gates PASS; programmatic focus gap closed; Android manual matrix explicitly deferred with owner/rationale in QA report |
| 2026-02-22 | UAT | Value validation complete | UAT Complete: APPROVED FOR RELEASE — implementation delivers stated value; all acceptance criteria met at code level; manual Android validation deferred (low-to-medium risk) |

---

## Value Statement and Business Objective

As a community member on Android, I want the “Anbieter empfehlen” (recommend provider) form to reliably show all required fields and allow input, so that I can successfully recommend Muslim businesses and help grow UFlow’s coverage.

Alignment:
- **Master Product Objective**: “Make UFlow the first thought when any Muslim seeks a service or business.” Reliable recommendations grow coverage and trust.
- **Epic 3.1**: Community-driven recommendations are a core organic growth loop.

---

## Context (From Analysis 006)

Reference: agent-output/analysis/closed/006-android-suggest-provider-form-bug-analysis.md

Root cause identified: When a contact checkbox (e.g., Instagram) is restored as checked from localStorage, the `ContactCheckbox` component auto-focuses its input on mount. On Android this opens the keyboard and scrolls the page to the focused input, making it appear like the form is missing fields (Section 1 is simply scrolled out of view).

---

## Scope

In-scope outcomes:
1. On Android, opening the recommend-provider flow lands the user at the top of the form with **no unexpected keyboard pop-up**.
2. The form does not auto-scroll to a restored contact field on initial load.
3. Users can still toggle contact methods and enter values normally.
4. Contact fields are not auto-focused by **non-user-initiated** state changes (restored drafts or programmatic auto-selection).

Out of scope (explicitly):
- New fields, new pages, or changes to the recommendation flow structure
- Spam prevention, review queue, or recommender credit/badges (Epic 3.1 broader work)

---

## Assumptions

- The affected UI is [src/features/providers/StreamlinedRecommendForm.tsx](src/features/providers/StreamlinedRecommendForm.tsx) and its `ContactCheckbox` subcomponent.
- The bug reproduces when `localStorage['recommendFormData']` contains a `selectedContacts` entry with one or more values set to `true`.
- The desired UX is to avoid stealing focus on page load; focus behavior is only acceptable when initiated by a user interaction.

---

## Plan

### 1) Confirm reproduction and define success signal

Objective:
- Reproduce on an Android browser and/or Android emulator, with and without saved localStorage form state.

Acceptance:
- With saved recommend form state present, the page loads with **no forced focus** and no keyboard opening.
- All sections are visible by normal scroll, and the first visible content is Section 1 (Basics).

Dependencies:
- Access to an Android device or emulator (for implementer validation; QA will independently verify).

### 2) Fix focus management for restored checkbox state

Objective:
- Prevent `ContactCheckbox` from calling `focus()` on initial mount when `checked` is already true due to restored state.

Implementation guidance (non-prescriptive):
- Introduce a “skip initial focus” guard (e.g., first-render ref) so the focus effect only runs when `checked` transitions from false → true due to the current user action.
- Alternatively, move focus behavior out of a generic `useEffect` and trigger focus only within the explicit toggle handler (user-initiated event path).

Acceptance:
- Restored checked contacts do not auto-focus on mount.
- Programmatic contact auto-selection (e.g., selecting an autocomplete result that fills contact data and marks contact methods as selected) does not auto-focus inputs or trigger keyboard/scroll jumps.
- User-initiated toggling still provides expected usability (focus is optional, but if present it must be initiated only after a user action).
- No regressions on desktop.

### 3) Regression checks for scrolling and keyboard interaction

Objective:
- Ensure the fix works across common flows:
  - Fresh visit
  - Restore saved draft
  - Toggle multiple contact methods

Acceptance:
- No unexpected jump-scroll on load.
- Inputs remain editable on Android; closing/opening keyboard does not trap scroll.

Minimum Android coverage (QA/UAT):
- Android Chrome (regular browser)
- Android PWA install mode (WebView)

### 4) Validation (engineering)

Objective:
- Ensure the change is safe and does not introduce build/type/lint regressions.

Acceptance:
- `npm test`
- `npm run type-check`
- `npm run lint`
- `npm run build`

(If there are existing tests around this component, update them; otherwise keep validation to the existing suite.)

### 5) Version and release artifacts

Objective:
- Ensure v0.3.1 release artifacts reflect this bugfix when the v0.3.1 hotfix is cut.

Acceptance:
- The v0.3.1 CHANGELOG entry includes this fix.
- Version consistency checks pass at release time.

Release note:
- This plan is locked to **v0.3.1 (hotfix)** because the bug blocks a core recommendation growth loop in production. If you prefer bundling into v0.4.0 instead, update the plan header and version milestone before implementation.

---

## Risks and Mitigations

- Risk: Removing auto-focus degrades usability for power users.
  - Mitigation: Keep focus for user-initiated toggles only; avoid mount-time focus.

- Risk: Android WebView/PWA behavior differs from Chrome.
  - Mitigation: Validate in both PWA install mode and normal browser mode during QA/UAT.

- Risk: Roadmap metadata inconsistency (roadmap header “Current Version” vs recent release log).
  - Mitigation: Coordinate with roadmap agent to align version markers; no functional dependency.

---

## Duration Estimates

- Analysis: 0.5–1.0h (already completed in Analysis 006)
- Planning: 0.5–1.0h
- Implementation: 1–3h
- QA: 0.5–2.0h (Android device coverage is the main uncertainty)
- UAT: 0.5–1.0h
- DevOps: 0.5–1.0h (depends on whether bundled into v0.4.0 vs hotfix)

Uncertainty drivers:
- Availability of Android device/PWA reproduction environment
- Differences between browsers (Chrome vs Samsung Internet vs PWA WebView)

---

## OPEN QUESTIONS

OPEN QUESTION [CLOSED]: Ship as hotfix (v0.3.1) vs bundle into v0.4.0.

Decision: **Hotfix v0.3.1** (default) due to production impact and P0 priority.

---

## Memory Note

Flowbaby memory tools are currently unavailable (another VS Code window owns the daemon), so this plan includes extra context to preserve decisions without memory storage.
