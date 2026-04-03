---
ID: 075
Origin: 075
UUID: d4e8f1a7
Status: APPROVED
---

# Critique: 075 — Fix Background Overlay on Footer CTA During iOS Scroll

| Field            | Value                                                             |
|------------------|-------------------------------------------------------------------|
| **Artifact**     | agent-output/planning/075-bg-footer-scroll.md                    |
| **Analysis**     | agent-output/analysis/closed/075-bg-footer-scroll.md             |
| **Date**         | 2026-04-03T10:30Z                                                 |
| **Status**       | APPROVED                                                          |
| **Verdict**      | APPROVED — proceed to Implementer                                 |

## Changelog

| Date              | Handoff      | Request               | Summary                                           |
|-------------------|--------------|-----------------------|---------------------------------------------------|
| 2026-04-03T10:30Z | Planner → Critic | Initial plan review | Initial critique; all findings LOW; APPROVED      |

---

## Value Statement Assessment

**PASS.**

The value statement is present, correctly formatted as a user story, and delivers direct value:

> "As a mobile user on an iPhone SE or iPhone 16 Pro, I want the Save/Share CTA buttons at the bottom of a provider detail page to remain fully visible and unobscured during all scroll/drag gestures, so that I can always interact with the primary conversion actions without visual glitches."

- "So that" outcome is verifiable: the footer CTA must be unobscured during all scroll/drag gestures — a binary, testable condition.
- Alignment: provider detail page is the primary conversion surface; this directly protects conversion, which is a core product objective.
- Value delivery is direct, not deferred.

---

## Overview

A minimal, well-scoped CSS-only bugfix targeting two files: `ProviderDetailPage.tsx` and `ProviderCardModal.tsx`. The root cause is accurately identified (iOS scroll chaining from a scroll container lacking `overscroll-behavior-y: contain`) and the fix is proportionate (add one Tailwind class, change one opacity class per file). Scope is clearly bounded. Decision record is fully resolved. No open questions.

---

## Architectural Alignment

**PASS.** The fix is consistent with established codebase patterns:
- `overscroll-behavior-y: contain` already exists on `.scrollable-container` in `globals.css`. The plan applies the same constraint via Tailwind's `overscroll-contain` — consistent with the project's Tailwind-first approach.
- No new abstractions, no new components, no new utility classes.
- No changes to shared layout shell (RootClientLayout) — risk-bounded correctly (D4).
- No changes to the pattern overlay `body::before` (D5) — correct scoping.

---

## Scope Assessment

**PASS.** Scope is minimal and well-defined.

- M1: One class added to one div in ProviderDetailPage.
- M2: One class changed and one class removed per footer element in two files.
- M3 & M4: Standard verification and release housekeeping.
- Out-of-scope items (top-of-screen fix, ProfileProviderDetailButtons) are explicitly documented.

---

## Technical Debt Risks

None introduced. The plan reduces existing technical debt by patching an iOS scroll chain gap that the `.scrollable-container` class already addressed globally but was not applied here.

---

## Findings

| # | Title | Severity | Status | Description | Impact | Recommendation |
|---|-------|----------|--------|-------------|--------|----------------|
| F1 | ProviderCardModal inner scroller lacks `overscroll-contain` | LOW | OPEN | The plan applies the opacity fix (M2) to the modal, but does **not** apply `overscroll-contain` (M1) to the modal's inner scroll container. `ProviderCardModal` uses `fixed inset-x-0 bottom-0 top-6` as its outer shell with a separate inner scroll area (not `h-screen-fix overflow-y-auto`). The opacity fix masks bleed-through visually but doesn't prevent the modal from triggering iOS rubber-band at the viewport level during modal content overscroll. | On iOS, users who encounter the modal path may still see content shift during modal overscroll gestures. Not the reported bug path (detail page is the reported surface) but the same underlying vulnerability. | Consider adding `overscroll-contain` to the modal's scroll container in a follow-up, or note it explicitly as a known remaining gap in the Handoff Notes. Flagging here for implementer awareness; does not block this plan. |
| F2 | `ProfileProviderDetailButtons` custom footer gap not tracked | LOW | OPEN | The State-Machine table flags this branch as out of scope with "file a follow-up if needed" but no tracking item is created. | Risk of it being forgotten post-implementation. | Implementer should create a task/comment for this as part of M4 or note it in the implementation doc. Not a blocker. |

No CRITICAL or MEDIUM findings.

---

## Unresolved Open Questions

None. All decisions in the Decision Record are [RESOLVED].

---

## Risk Assessment

Low-risk plan overall.

- The `overscroll-contain` change is isolated to the inner scroll container only; there is no risk of propagation to the shared layout shell.
- Making the footer opaque is a visual-only change with trivially low design impact.
- Rollback is a two-class revert.
- Browser support: `overscroll-behavior` is fully supported on iOS Safari 16+ (iPhone SE 3rd gen: iOS 15.4+; iPhone 16 Pro: iOS 18). Safe.

---

## Recommendations

1. **F1 — Modal follow-up** (LOW, does not block): In the implementation doc or M4 CHANGELOG entry, note that `ProviderCardModal` inner scroll overscroll containment is a known remaining gap for a future patch.
2. **F2 — ProfileProviderDetailButtons** (LOW, does not block): Add a code comment or follow-up item during implementation.

---

## Revision History

| Revision | Changes from Plan | Findings Addressed | Status Changes |
|----------|-------------------|--------------------|----------------|
| Initial  | —                 | —                  | APPROVED on first read; no revisions required |
