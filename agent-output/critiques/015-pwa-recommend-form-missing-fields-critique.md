---
ID: 015
Origin: 015
UUID: 7b2f3c1a
Status: OPEN
---

# Critique — Plan 015: PWA "Anbieter empfehlen" missing input fields

**Artifact**: [agent-output/planning/015-pwa-recommend-form-missing-fields.md](../planning/015-pwa-recommend-form-missing-fields.md)  
**Date**: 2026-02-23  
**Status**: Initial Review  
**Verdict**: **APPROVED** (with LOW advisory notes)

## Change Log

| Date (UTC) | Handoff From | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23 | Planner | Initial critique | Plan approved; minor advisory items noted |

---

## Value Statement Assessment

| Check | Finding | Status |
| --- | --- | --- |
| **Presence** | Clear user story format: "As a PWA user on Android (MIUI/Xiaomi)…" | ✅ PASS |
| **Clarity** | "So that" outcome is verifiable: form displays, user can submit | ✅ PASS |
| **Alignment** | Supports Master Product Objective by unblocking recommendation entrypoint | ✅ PASS |
| **Directness** | Value delivered directly in v0.6.1 patch | ✅ PASS |

**Assessment**: Value statement is well-formed. The bugfix directly enables users to complete a core workflow (recommending providers), preventing drop-off at a key conversion point.

---

## Overview

Plan 015 addresses a user-reported bug where the "Anbieter empfehlen" (Recommend Provider) form shows only the "Basics" heading and submit button, but no input fields, on a Xiaomi 13T Pro running the PWA in standalone mode. The Analyst investigation identified three hypotheses (high: `-webkit-fill-available` collapse; medium: nested scroll ambiguity; medium: stale SW cache).

The plan proposes:
1. Reproduce and capture evidence
2. Fix the `h-screen-fix` CSS utility
3. Reduce scroll-container ambiguity
4. SW cache sanity check
5. Regression verification across devices
6. Version bump and changelog

---

## Architectural Alignment

| Check | Finding | Status |
| --- | --- | --- |
| **Respects Postgres-first** | N/A (no DB changes) | ✅ N/A |
| **Follows folder structure** | CSS changes in `src/styles/globals.css`; no new files | ✅ PASS |
| **Minimal footprint** | Plan explicitly prefers minimal/gated CSS changes | ✅ PASS |
| **No premature services** | No new dependencies | ✅ PASS |

**Assessment**: Plan aligns with existing architecture. Changes are scoped to CSS/layout primitives with explicit guidance to avoid broad regressions.

---

## Scope Assessment

| Aspect | Finding |
| --- | --- |
| **Boundaries** | Clear: fix rendering on MIUI PWA standalone; no feature additions |
| **Deliverables** | Listed with acceptance criteria per step |
| **Dependencies** | None external; relies on device access for reproduction |
| **Risks** | Documented (iOS Safari, header blur, SW caching) with mitigations |
| **Semver** | v0.6.1 patch — appropriate for bugfix |

**Assessment**: Scope is appropriately bounded for a patch release. Deliverables are clear.

---

## Technical Debt Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| **`h-screen-fix` is a shared utility** | LOW | Plan acknowledges need to verify across iOS/Android/desktop; gating with `@supports` is sound |
| **Nested scroll containers pattern** | LOW | Plan option to add `position: relative` is minimal; no architectural debt introduced |
| **No automated test for MIUI layout** | LOW | Acceptable for device-specific CSS bugs; manual verification sufficient |

**Assessment**: No significant debt introduced. The plan prefers minimal, reversible changes.

---

## Findings

### CRITICAL Findings
(None)

### HIGH Findings
(None)

### MEDIUM Findings
(None)

### LOW Findings

| ID | Issue | Status | Description | Impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| L1 | OPEN QUESTIONS not blocking | OPEN | Two OPEN QUESTIONS remain (root cause confirmation, browser vs PWA reproduction). Plan proceeds with both hypotheses covered. | Low — plan addresses all hypotheses regardless | Resolve during Step 1 (reproduction) and document findings in PR. No blocker. |
| L2 | Device access uncertainty | OPEN | Key uncertainty is Xiaomi device access for reproduction. | May delay Step 1 | Consider emulator fallback (Android Studio with custom viewport) or user-assisted remote debugging if device unavailable. |

---

## Questions for Planner

1. Is there a fallback reproduction strategy if Xiaomi 13T Pro hardware is unavailable? (e.g., BrowserStack, user remote session)  
   *Severity*: LOW — does not block approval.

---

## Risk Assessment

| Risk | Likelihood | Impact | Plan Mitigation | Adequate? |
| --- | --- | --- | --- | --- |
| iOS Safari regression | Medium | Medium | Feature-query gating; iOS verification | ✅ Yes |
| PageHeader blur breaks | Low | Low | Restrict changes to smallest primitive | ✅ Yes |
| SW prevents fix delivery | Low | Medium | Confirm update flow; aligned with next-pwa defaults | ✅ Yes |

---

## Recommendations

1. **Proceed to implementation.** Plan is clear, scoped, and addresses the bug with minimal risk.
2. During Step 1, document whether the issue is PWA-only or also affects Chrome browser mode — this informs whether `display-mode: standalone` gating is needed.
3. If Xiaomi hardware is unavailable, attempt BrowserStack or coordinate a remote debugging session with the reporting user.

---

## Unresolved Open Questions

The plan contains 2 OPEN QUESTIONS:
- Root cause confirmation (Step 1 will resolve)
- Browser vs PWA reproduction (Step 1 will resolve)

**Verdict**: These are appropriate investigation items for Step 1 of the plan. They do NOT block implementation start since the plan covers all hypotheses.

---

## Verdict

**APPROVED**

The plan is well-structured, appropriately scoped for a patch release, delivers direct user value, and includes adequate risk mitigations. The LOW findings are advisory and do not block implementation.

---

## Revision History

| Revision | Date | Changes | Findings Addressed | New Findings | Status |
| --- | --- | --- | --- | --- | --- |
| Initial | 2026-02-23 | First review | — | L1, L2 | APPROVED |
