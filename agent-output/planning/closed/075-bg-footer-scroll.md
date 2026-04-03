---
ID: 075
Origin: 075
UUID: d4e8f1a7
Status: Committed for Release v0.10.3
---

# 075 — Fix Background Overlay on Footer CTA During iOS Scroll

| Field             | Value                                                                   |
|-------------------|-------------------------------------------------------------------------|
| **Plan ID**       | 075                                                                     |
| **Epic Alignment**| Mobile UX quality — provider detail page conversion surface              |
| **Target Release**| v0.10.3 (adjusted at DevOps Stage 1 after upstream advanced to v0.10.2) |
| **Related Issues**| Session S075-bg-footer-scroll                                           |
| **Status**        | Committed for Release v0.10.3                                           |

## Changelog

| Date                  | Agent   | Summary                                                         |
|-----------------------|---------|-----------------------------------------------------------------|
| 2026-04-03T10:15Z     | Planner | Initial plan created from analysis 075-bg-footer-scroll.md      |
| 2026-04-03T10:45Z     | Implementer | M1 + M2 complete; CSS changes applied; pending QA verification |
| 2026-04-03T13:35Z     | QA      | Automated gates PASS; manual iOS validation DEFERRED to device owner |
| 2026-04-03T13:37Z     | DevOps  | Stage 1 preflight adjusted target release to v0.10.3 (v0.10.2 already tagged upstream) |
| 2026-04-03T13:43Z     | DevOps  | Stage 1 local commit preparation complete; lifecycle moved to Committed |

## Value Statement and Business Objective

**As a** mobile user on an iPhone SE or iPhone 16 Pro,
**I want** the Save/Share CTA buttons at the bottom of a provider detail page to remain fully visible and unobscured during all scroll/drag gestures,
**so that** I can always interact with the primary conversion actions without visual glitches.

## Release Strategy

Standalone (no other known plans bundled into v0.10.3).

## Decision Record

| #  | Decision                                                                                          | Status                         |
|----|---------------------------------------------------------------------------------------------------|--------------------------------|
| D1 | Add `overscroll-behavior-y: contain` to ProviderDetailPage mobile scroll container                | [RESOLVED] Prevents iOS scroll chaining that triggers rubber-band desync between scroll content and `position: fixed` footer |
| D2 | Make footer CTA background opaque (`bg-white` instead of `bg-white/95`), remove `backdrop-blur-sm`| [RESOLVED] Eliminates visual bleed-through entirely; the 5% transparency served no meaningful UX purpose and harmed iOS compositing reliability |
| D3 | Apply same fixes to `ProviderCardModal` footer (line 780 of ProviderCardModal.tsx)                | [RESOLVED] Same `bg-white/95` pattern exists; fix both for consistency and to prevent the same bug on the modal path |
| D4 | Do NOT change `<main overflow-y-auto>` in RootClientLayout                                        | [RESOLVED] Changing the shared layout shell risks regressions across all pages; the inner-container fix (D1) is sufficient to break the scroll chain |
| D5 | Do NOT touch `body::before` pattern overlay                                                       | [RESOLVED] L3-confidence contributor only; fix is addressed fully by D1+D2; pattern overlay is a global design element |
| D6 | Scope limited to bottom CTA overlay on upward drag; top-of-screen display already fixed separately| [RESOLVED] Per user clarification |

## Assumptions

1. The bug is caused by iOS scroll chaining + compositor desync, not a z-index ordering issue (analysis F1 at L2 confidence).
2. The `overscroll-behavior-y` property is supported on the target devices (iOS Safari 16+; iPhone SE 3rd gen and iPhone 16 Pro both run iOS 16+).
3. Making the footer fully opaque has no negative design impact — the glass-morphism effect at 95% opacity is negligible.

## Plan

### Milestone 1 — Fix ProviderDetailPage Mobile Scroll Container

**Objective**: Prevent iOS scroll chaining from the inner scroll container to the viewport.

**Where**: `src/components/providers/ProviderDetailPage.tsx`

**Tasks**:

1. On the mobile wrapper div (currently `className="h-screen-fix overflow-y-auto bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]"`), add Tailwind class `overscroll-contain` (maps to `overscroll-behavior: contain`).

**Acceptance**:
- The mobile provider detail page no longer triggers viewport rubber-band bounce on bottom/top overscroll.
- Scroll remains smooth and functional within the content area.

### Milestone 2 — Make Footer CTA Fully Opaque

**Objective**: Eliminate any visual bleed-through from page content behind the footer CTA.

**Where**: `src/components/providers/ProviderDetailPage.tsx` (line ~595) and `src/components/providers/ProviderCardModal.tsx` (line ~780)

**Tasks**:

1. In ProviderDetailPage, change the footer CTA div from `bg-white/95 ... backdrop-blur-sm` to `bg-white` (remove `backdrop-blur-sm`).
2. In ProviderCardModal, change the footer div from `bg-white/95` to `bg-white` for consistency.

**Acceptance**:
- Footer CTA is fully opaque with no content visible behind it.
- Visual appearance remains clean and consistent with the rest of the app.

### Milestone 3 — Verification

**Objective**: Confirm the fix resolves the reported bug on target devices.

**Tasks**:

1. Test on iPhone SE viewport (375×667) — scroll to bottom, perform upward drag, verify footer CTA is never overlayed.
2. Test on iPhone 16 Pro viewport (393×852) — same verification.
3. Verify no regression on desktop (modal path should still work correctly).
4. Verify no regression on other mobile pages that use `<main overflow-y-auto>` as scroller.

**Acceptance**:
- Footer CTA remains fully visible and accessible during all scroll/drag gestures on both target viewports.
- No visual regressions on other pages.

### Milestone 4 — Update Version and Release Artifacts

**Tasks**:

1. Update `package.json` version to the next available patch.
2. Add CHANGELOG.md entry documenting the footer overlay fix.
3. Commit with descriptive message.

**Acceptance**:
- Version artifacts updated and consistent.
- CHANGELOG reflects the fix.

## State-Machine Coverage

The mobile ProviderDetailPage mobile return path has a single conditional: `customActionButtons ? customActionButtons : <default footer CTA>`.

| Branch                      | Affected? | Fix Applied? |
|-----------------------------|-----------|-------------|
| Default footer CTA (Save/Share) | Yes — the reported path | Yes (M1 + M2) |
| Custom action buttons (e.g., ProfileProviderDetailButtons) | May be affected — custom buttons render their own fixed footer | Out of scope — custom buttons handle own styling; file a follow-up if needed |
| ProviderCardModal footer (desktop-on-mobile) | Same `bg-white/95` pattern | Yes (M2, D3) |

## Testing Strategy

- **Unit**: Not applicable — this is a CSS-only fix with no logic changes.
- **Integration**: Visual testing on iOS Safari viewports (iPhone SE + iPhone 16 Pro).
- **Regression**: Verify scroll behavior on other pages (providers list, community services, profile) to confirm `overscroll-contain` on the detail page does not affect parent layout scrolling.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `overscroll-contain` prevents desirable scroll chaining in some edge case | Low | Medium | Only applied to the inner scroll container; parent `<main>` is not changed |
| Opaque footer changes the visual design intent | Low | Low | The 5% transparency was negligible; design review can confirm |
| `ProfileProviderDetailButtons` custom footer has the same bug | Medium | Medium | Out of scope; flagged for follow-up if needed |

## Duration Estimates

| Phase           | Estimate     | Uncertainty Driver                              |
|-----------------|-------------|------------------------------------------------|
| Implementation  | 15–30 min   | Two-line CSS change; straightforward            |
| QA / Verification | 30–60 min | Requires iOS device testing on two viewports    |
| DevOps          | 15 min      | Standard patch release                          |
| **Total**       | **1–2 hours** | iOS device availability is the main variable  |

## Handoff Notes

- **Implementer**: This is a 2-file, CSS-only change. No logic changes needed.
- **QA**: Focus on iOS Safari on iPhone SE and iPhone 16 Pro. Test bottom overscroll specifically. The top-of-screen issue is out of scope (already fixed).
- **Rollback**: Revert the two classes back to their original values. Zero risk.
