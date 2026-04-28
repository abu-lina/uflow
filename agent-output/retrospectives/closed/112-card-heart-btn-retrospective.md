---
ID: 112
Origin: 112
UUID: a1b2c3d4
Status: Processed
---

# Retrospective 112: ProviderCard Heart Button Overlay

**Plan Reference**: Session handoff S112-card-heart-btn (no canonical planning artifact)
**Date**: 2026-04-28T15:30Z
**Focus**: UX relocation, mid-session regression repair, QA dead-code discovery, process observations.

---

## Summary

**Value Statement**: As a user browsing provider cards, I want the bookmark control at the top-right of the image so I can save a provider quickly without reading to the bottom of the card — and as an admin I want moderation controls unchanged.

**Value Delivered**: YES — all 6 acceptance criteria verified in UAT. Overlay renders correctly, bottom action row removed in bookmark mode, moderation mode intact, navbar visible on `/providers`, search tab active.

**Implementation Duration**: ~4 hours (session start → Stage 2 complete 2026-04-28)

**Overall Assessment**: Clean delivery of a focused UX improvement. Scope expanded mid-session due to a user-reported regression (missing navbar on `/providers`) but was handled without rework. One process friction point: QA discovered 3 dead-code items (unused import, unused state vars) that should have been caught at the implementation review phase. No blockers reached production.

---

## Timeline Analysis

| Phase | Actual Duration | Notes |
|---|---|---|
| Implementation | ~2h | Overlay implementation + PO decision (no full Barik) + bottom row removal |
| Mid-session regression | ~30m | User reported missing navbar on /providers; RootClientLayout + MobileFooterBar fixes added |
| Code Review | ~30m | APPROVED_WITH_COMMENTS; 1 low finding (stale prop) |
| QA | ~30m | Found 3 dead-code linting errors, fixed, re-verified. 53/53 tests. |
| UAT | ~20m | 6/6 scenarios pass, APPROVED FOR RELEASE |
| DevOps Stage 1 + 2 | ~30m | No version collision, no rebase needed, clean push |
| **Total** | **~4h** | No significant variance |

---

## What Went Well

### Scope Containment
- Overlay relocation was implemented with minimal blast radius: only ProviderCard.tsx, no API changes, no DB touches, no shared state mutations.
- Moderation mode rendering path was explicitly verified unchanged — critical gate given admin workflows.

### Regression Discovery and Fix
- User-reported `/providers` navbar regression was caught and resolved within the same session, not deferred to a follow-up.
- Regression tests were added immediately (`[post-fix PASSES]` naming convention followed), making the fix permanently visible.

### PO Decision Integration
- Allahuma Barik animation suppression was a live PO decision applied mid-implementation.
- Decision was documented in memory, in the implementation doc, and covered by a dedicated regression test — no risk of silent reintroduction.

### Test Coverage Depth
- 53 total tests across 3 test files (ProviderCard 38, RootClientLayout 13, MobileFooterBar 2).
- Coverage exceeded the planned ~25 by +28 tests, providing strong regression safety net.

### Clean Release
- Branch was at origin/main HEAD when created — no rebase needed at Stage 2.
- No version collision (single worktree session; only one tag bump needed).
- Build compiled cleanly: ✓ Compiled 19.1s, ✓ 267/267 static pages.

---

## What Could Be Improved

### PI-1: Dead Code Should Not Reach QA

**Observation**: QA discovered 3 linting errors (unused import `AnimatedHeartIcon`, unused state `isHovered`, unused state `wasBookmarked`) that were not caught during implementation or code review.

**Root cause**: The refactor removed the functionality that consumed these symbols but did not sweep for orphaned declarations in the same pass.

**Impact**: Minor — fixed in QA, tests re-verified, no regressions. But any linting error reaching QA represents an avoidable delay.

**Process Improvement PI-1**: After any refactor that removes a feature branch (e.g., removing a render block, removing an event handler), run `npm run lint` immediately and sweep for `no-unused-vars` errors before committing. Do not defer lint to QA.

**Owner**: Implementer

---

### PI-2: Mid-Session Scope Expansion Needs Explicit Handoff Note

**Observation**: The navbar restoration fix (RootClientLayout + MobileFooterBar active state) was added mid-session in response to a user-reported regression. This was the right call, but the resulting implementation doc `Files Modified` table only listed the original 2 files, not the 3 additional files added during the expansion.

**Root cause**: Implementation doc was updated to reflect PO decision but not re-swept for the scope expansion files.

**Impact**: Minor — code review caught all files. But a QA or UAT agent reading the implementation doc would have a partial file list.

**Process Improvement PI-2**: When mid-session scope expands (regression fix, follow-up request), update the implementation `Files Modified` table immediately before proceeding to code review. Treat the table as a live ledger, not a one-time snapshot.

**Owner**: Implementer

---

## Process Improvements Summary

| ID | Title | Severity | Owner | Applies When |
|---|---|---|---|---|
| PI-1 | Run `npm run lint` after any refactor that removes a feature branch | Medium | Implementer | Any refactor removing render blocks, event handlers, or imported components |
| PI-2 | Update `Files Modified` table live during mid-session scope expansion | Low | Implementer | Any session where scope expands after initial implementation pass |

---

## Metrics

| Metric | Value |
|---|---|
| Files modified (source) | 5 |
| Tests added/updated | +53 total passing (net: +38 ProviderCard, +13 RootClientLayout, +2 MobileFooterBar) |
| Linting errors introduced | 3 (fixed during QA) |
| Linting errors reaching production | 0 |
| Regressions introduced | 0 |
| Deferred items | 1 (stale `hideWebsiteButton` prop cleanup — low priority) |
| Open actions created | 0 |
| Version bump | v0.10.40 → v0.10.41 (patch) |

---

## Deferred Items

| Item | Owner | Trigger |
|---|---|---|
| Remove stale `hideWebsiteButton` prop from ProviderCard interface | Engineering | Next ProviderCard refactor or prop audit sprint |

---

## Reference

- Implementation: `agent-output/implementation/closed/112-card-heart-btn.md`
- Code Review: `agent-output/code-review/closed/112-card-heart-btn-code-review.md`
- QA: `agent-output/qa/closed/112-card-heart-btn-qa.md`
- UAT: `agent-output/uat/closed/112-card-heart-btn-uat.md`
- Deployment: `agent-output/deployment/closed/v0.10.41-plan-112.md`
