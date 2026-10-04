---
ID: 078
Origin: 078
UUID: f7a9c3e1
Status: Committed
---

# Plan: Admin Provider Toast Safe-Area Fix

**Target Release**: v0.10.7 (adjusted from preliminary v0.10.6 due to version collision)
**Epic Alignment**: UX quality / PWA viewport correctness (ongoing)
**Related Issues**: None (reported via UAT screenshot on iPhone 15 Pro)

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-04-04T08:15Z | Planner | Plan created from analysis 078 | Inherits ID/Origin/UUID |
| 2026-04-04T08:31Z | Implementer | Status -> In Progress | Started TDD implementation for safe-area toaster fix |
| 2026-04-04T08:42Z | Code Reviewer | Status → Code Review Approved | APPROVED — clean implementation, TDD verified, ready for QA |
| 2026-04-04T08:52Z | QA | Status → QA Complete | Automated gates passed with documented non-plan blockers; manual cross-device validation deferred to UAT |
| 2026-04-04T08:56Z | UAT | Status → UAT Approved | APPROVED FOR RELEASE with DF-1 manual visual closure gate before production promotion |
| 2026-04-04T09:05Z | DevOps | Target Release → v0.10.7 | Version collision: v0.10.6 tag exists on origin; bumped to v0.10.7 |
| 2026-04-04T09:12Z | DevOps | Status → Committed | Plan committed locally for release v0.10.7 |

---

## Value Statement and Business Objective

**As an** admin moderating providers on a mobile iOS device,
**I want** toast notifications (approve/reject feedback) to appear **below** the device status bar,
**so that** I can read action confirmations without UI overlap and trust that my moderation actions succeeded.

---

## Release Strategy

**Standalone** — no other known non-closed plans target the next available patch after v0.10.5.

Note: Plans 019, 021, 022, 028, 029, 071 are UAT Approved but target earlier releases. They are stalled awaiting DevOps commit and do not conflict with this plan's version target.

---

## Decision Record

| # | Decision | Status | Rationale |
|---|----------|--------|-----------|
| 1 | Fix via CSS override in `toast-custom.css` targeting Sonner's toaster data attributes, combined with Sonner's `offset`/`mobileOffset` prop if CSS env() is consumed correctly | [RESOLVED] | CSS approach is the established pattern in this codebase (Header, MobileNavbar use `env(safe-area-inset-top)` in CSS). Sonner's offset prop also supports string values and per-side object notation, giving the implementer two complementary surfaces. |
| 2 | Fix applies globally to ALL toasts, not just admin approve/reject | [RESOLVED] | The Toaster component is a singleton in `ClientProviders.tsx`. All 152 toast call sites across the app benefit from the fix. Scoping to admin-only would require a separate Toaster instance, which adds complexity for no gain. |
| 3 | Only `top` position toasts are affected; bottom-positioned toasts not in scope | [RESOLVED] | Current Toaster uses `position="top-center"`. No bottom-positioned toasts are configured. If bottom positions are added in the future, the same pattern should be applied for `safe-area-inset-bottom`. |
| 4 | No change to `viewport-fit: cover` setting | [RESOLVED] | Removing `viewport-fit: cover` would break the immersive PWA experience and regress the Header/MobileNavbar safe-area handling that already works correctly. |
| 5 | Affected devices: iPhone X and newer with notch/Dynamic Island | [RESOLVED] | `viewport-fit: cover` + `env(safe-area-inset-top)` only operates on iOS devices with safe-area insets. Desktop, Android, and pre-iPhone-X devices see `env()` evaluate to the fallback value (0px or default offset), causing no visual change. |

---

## Assumptions

1. Sonner v2.0.3 (installed) supports the `offset` / `mobileOffset` props per current documentation — verified via Sonner docs.
2. CSS `[data-sonner-toaster]` selector can target the rendered Sonner container — consistent with existing `[data-sonner-toast]` overrides in `toast-custom.css`.
3. `env(safe-area-inset-top)` evaluates to 0px on devices without safe-area insets, making the fix safe for non-iOS devices.

---

## Plan

### Milestone 1: Implement Safe-Area Offset for Toaster

**Objective**: Ensure the Sonner Toaster renders toasts below `env(safe-area-inset-top)` on iOS devices with notch/Dynamic Island.

**Fix Surface**: Two files, one or both modified by implementer:

| File | Purpose |
|------|---------|
| `src/components/layout/ClientProviders.tsx` | Sonner `<Toaster>` configuration — add `offset` or `mobileOffset` prop |
| `src/styles/toast-custom.css` | CSS overrides for Sonner — add positioning rule targeting `[data-sonner-toaster]` |

**Approach Guidance** (implementer chooses optimal implementation):
- Sonner supports `offset` as string, number, or per-side object: `{ top: '...', bottom: '...' }`
- Sonner supports `mobileOffset` (applied when viewport < 600px) with same format
- CSS `[data-sonner-toaster][data-y-position="top"]` can override positioning via stylesheet
- The existing codebase pattern uses `calc(env(safe-area-inset-top) + Npx)` — follow this pattern for consistency
- On non-safe-area devices, `env(safe-area-inset-top)` evaluates to `0px`, preserving current behavior

**Acceptance Criteria**:
1. Toast notifications on iPhone 15 Pro (and equivalent notch/Dynamic Island devices) render entirely below the status bar region
2. Toast positioning on desktop browsers is unchanged (no visual regression)
3. Toast positioning on Android browsers is unchanged
4. All 152 existing toast call sites benefit from the fix (global Toaster configuration)
5. No changes to `viewport-fit: cover` in `layout.tsx`

---

### Milestone 2: Verify No Other Fixed-Position Safe-Area Gaps

**Objective**: Confirm that no other third-party or custom fixed-position components are missing safe-area handling.

**Tasks**:
1. Scan for `position: fixed` or Tailwind `fixed` class usage in `src/` components
2. For each, verify `env(safe-area-inset-*)` is applied where relevant
3. Document any additional gaps found (may result in follow-up work)

**Acceptance Criteria**:
1. Scan completed and results documented in implementation notes
2. Any additional gaps either fixed in this plan (if trivial) or logged as follow-up

---

### Milestone 3: Update Version and Release Artifacts

**Objective**: Update version artifacts to match the target release.

**Tasks**:
1. Update `package.json` version to target release version
2. Add CHANGELOG.md entry documenting the safe-area toast fix
3. Commit message references Plan 078

**Acceptance Criteria**:
1. `package.json` version matches target release
2. CHANGELOG.md entry present under correct version heading
3. Version consistency verified across project

---

## Testing Strategy

**Expected test types**: Unit test for Toaster configuration, manual device testing for visual verification.

**Coverage expectations**:
- Unit: Verify Toaster component renders with safe-area offset configuration (prop or CSS class present)
- Visual/Manual: Verify on iPhone 15 Pro (or simulator) that toast does not overlap status bar
- Regression: Verify desktop/Android toast positioning unchanged

**Critical scenarios**:
- Admin approve action → toast visible below status bar on iPhone 15 Pro
- Admin reject action → toast visible below status bar on iPhone 15 Pro  
- Any toast trigger → no desktop positioning regression
- PWA standalone mode on iOS → toast correctly positioned

**Note**: Specific test cases are QA agent's responsibility.

---

## Duration Estimates

| Phase | Estimate | Uncertainty Drivers |
|-------|----------|-------------------|
| Analysis | ✅ Complete | — |
| Planning | ✅ Complete | — |
| Implementation | 30–60 min | Depends on whether CSS-only fix suffices or needs JS-based offset calculation |
| Code Review | 15–30 min | Small change surface |
| QA | 30–60 min | Requires iOS device/simulator testing |
| DevOps | 15–30 min | Standard commit + deploy |

**Total**: ~2–3 hours end-to-end.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sonner's `offset` prop doesn't accept CSS `env()` values | Medium | Low | Fall back to CSS override approach via `toast-custom.css` |
| CSS specificity conflict with Sonner's inline styles | Low | Low | Use `!important` if needed (already established pattern for third-party overrides) |
| Fix breaks toast positioning on non-iOS devices | Very Low | Medium | `env(safe-area-inset-top)` evaluates to `0px` on non-iOS; verified by design |

---

## Rollback Considerations

Single-file change (or two-file at most). Revert is trivial: remove the offset prop or CSS rule. No database migrations, no API changes, no side effects.

---

## Handoff Notes

**For @Implementer**:
- Primary fix file: `src/components/layout/ClientProviders.tsx` (Toaster config) and/or `src/styles/toast-custom.css`
- Reference pattern: Header component at `src/components/layout/Header.tsx:115` uses `pt-[calc(env(safe-area-inset-top)+16px)]`
- Sonner API: `offset` (desktop default 32px), `mobileOffset` (mobile default 16px, applies < 600px viewport)
- Sonner data attributes: `[data-sonner-toaster]`, `[data-y-position="top"]`
- Design tokens available: `src/design-system/tokens/spacing.ts` defines `safe-top: 'env(safe-area-inset-top)'`

**For @Critic**:
- Scope is deliberately minimal: 1–2 files, ≤10 lines changed
- No architectural decision required — follows established codebase pattern
- No new dependencies

---

## Open Questions

**None.** All questions resolved during analysis phase.
