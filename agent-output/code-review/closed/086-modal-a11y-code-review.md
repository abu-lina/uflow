---
ID: 086
Origin: 086
UUID: a7f3c91e
Status: Committed
---

# Code Review: Plan 086 - Modal Accessibility Refactor

Plan Reference: agent-output/planning/086-modal-a11y-plan.md  
Implementation Reference: agent-output/implementation/086-modal-a11y-implementation.md  
Architecture Reference: agent-output/architecture/system-architecture.md  
Date: 2026-04-07  
Reviewer: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-07 | Implementer -> Code Reviewer | Review implementation before QA | Completed full artifact and file-level review. No critical/high findings. One low finding and one info note. Verdict APPROVED_WITH_COMMENTS. |
| 2026-04-07T11:45Z | DevOps | Stage 1 commit. Status → Committed. Moved to closed/. Target release v0.10.17. |

## Scope And Checklist Applicability

- Path Refactor / File Move Checklist: Not applicable (no file moves or path rewrites in implementation scope).
- Agent Spec / Cross-Workspace Path Checklist: Not applicable (no .github/agents changes and no cross-root path references introduced).
- Deployment Path Audit Checklist: Not applicable (no Docker/workflow/deploy/port/volume/env runtime path changes).
- Outbound Data-Flow Cross-Trace Checklist: Not applicable (no new router query-param contracts and no new API route-to-UI contracts).
- Interaction-Layer Audit Checklist: Applicable.
  - Interaction surfaces reviewed: modal wrapper, backdrop, content stacking, drag-close gesture path in Modal.
  - Verified: backdrop click gating via mousedown origin tracking, wrapper/backdrop/content layering, no parent shell event interception regressions introduced.
  - Result: No blocking interaction-layer defects found.
- Shared Results Actionability Checklist: Not applicable (no mixed-entity inline actions added).
- Deleted-Module Residue Sweep: Not applicable (no module deletion/rename in scope).

## Files Reviewed

- src/components/ui/Modal.tsx
- src/hooks/useScrollLock.ts
- src/hooks/useAriaHidden.ts
- src/hooks/useFocusTrap.ts
- src/hooks/useDelayedUnmount.ts
- src/__tests__/components/ui/Modal.test.tsx
- src/__tests__/hooks/useScrollLock.test.ts
- src/__tests__/hooks/useAriaHidden.test.ts
- src/__tests__/hooks/useFocusTrap.test.ts
- src/__tests__/hooks/useDelayedUnmount.test.ts
- src/__tests__/components/ProviderDetailModal.test.tsx
- CHANGELOG.md
- package.json
- package-lock.json
- agent-output/implementation/086-modal-a11y-implementation.md

## Architecture Alignment

Status: ALIGNED

- Implementation matches Arch 086 direction: four reusable hooks, no public modal prop expansion, no consumer refactor required.
- Escape handling, drag-close guard, aria-labelledby wiring, and stack-safe scroll lock all align with planned ADRs.
- Critique F1 is correctly acknowledged: exit-delay behavior is architecturally ready but not currently observable for always-mounted isOpen=true consumers.

## TDD Compliance Check

- TDD table present in implementation doc: Yes
- All rows complete: Yes
- Coverage quality: Good for all nine gaps, including focused hook unit tests and integrated modal behavior tests.

## Findings

### Critical

None.

### High

None.

### Medium

None.

### Low

1. Focus fallback path depends on container focusability but dialog container is not explicitly focusable.
- Severity: Low
- Location: src/hooks/useFocusTrap.ts:39 and src/components/ui/Modal.tsx:65
- Issue: The fallback branch calls container.focus() when no focusable descendants exist, but the modal dialog element has no explicit tabIndex. In some browser/AT combinations this can make fallback focus placement unreliable.
- Recommendation: Add tabIndex={-1} to the dialog container in Modal so fallback focus is consistently valid for zero-focusable-content scenarios.

### Info

1. Negative drag-close test is slightly indirect.
- Severity: Info
- Location: src/__tests__/components/ui/Modal.test.tsx:82
- Note: The negative case dispatches click on the dialog wrapper after mousedown on content. This still guards regression, but a direct backdrop-targeted sequence with opposing mousedown source would better mirror the exact bug path.

## Positive Observations

- Good SRP boundary: each hook encapsulates one concern, and Modal composition remains readable.
- Scroll lock implementation correctly restores original overflow and handles stacked instances.
- aria-hidden restoration logic preserves prior state rather than brute-force deleting attributes.
- TDD evidence is concrete and includes pre-fix failure signals.

## Verdict

Status: APPROVED_WITH_COMMENTS

Rationale: Implementation is architecture-aligned, test-backed, and free of critical/high risks. The remaining low/info items do not block QA and can be addressed as follow-up hardening.

## Required Actions

- No blocker required before QA.
- Recommended follow-up: add tabIndex={-1} to dialog container and tighten the drag-close negative test path.

## Next Step

Handing off to qa agent for test execution.
