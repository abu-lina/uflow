---
ID: 062
Origin: 062
UUID: c062f1a9
Status: Active
---

# Open Actions 062: Deferred Post-Deploy Follow-ups

## Summary

- UAT approved Plan 062 for release, but D1 and D2 require real-browser validation in UAT within 24 hours of deployment verification.
- QA also deferred two LOW-risk browser checks covering 320px layout density and Stage 3 footer regression.
- **CRITICAL POST-RELEASE FINDING (2026-03-26)**: D1 iOS device validation FAILED - parent wrapper `pointer-events: none` blocked touch events on iOS WebKit. Hotfix applied to `globals.css`. Requires re-validation after merge to main.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| **[REOPENED]** Stage 1 unauthenticated mobile tap routes Profile icon to `/login` | QA / DevOps | **IMMEDIATE** - After branch merge and UAT deployment | Real iOS device capture showing Profile icon tap successfully navigates to `/login` | **FAILED → REOPENED** |
| Stage 2 authenticated mobile tap routes Profile icon to `/profile` | QA / DevOps | Before or within 24h of UAT deployment verification | Authenticated mobile-browser capture of `/profile` transition with icon highlight visible | Open |
| 320px viewport layout verification for Stage 1 and Stage 2 | QA | Same browser session as the tap-path checks | Screenshot or recording at 320px showing no icon crowding and reachable touch targets | Open |
| Stage 3 `MobileFooterBar` profile regression check | QA | Same browser session as the tap-path checks | Browser verification that Stage 3 Profile still routes to `/profile` without visual regression | Open |
| **[NEW - iOS REGRESSION]** Verify `MobileFooterBar` touch events also work on iOS | QA | Same iOS device session as reopened D1 check | Real iOS device capture showing Stage 3 footer Profile icon tap works | Open |

## Post-Release Incidents

### Incident 1: iOS Touch Events Blocked (2026-03-26)

**Severity**: CRITICAL  
**Discovered by**: User real-device iOS testing during D1 validation  
**Status**: Two-part root cause fully resolved; pending merge + UAT deployment verification

#### Root Cause (Complete)

Two layers of `pointer-events: none` were blocking iOS Safari hit-testing:

| Layer | Class | Property | State |
|-------|-------|----------|-------|
| Slot | `.mobile-bottom-ui-slot` | `pointer-events: none` | **Never restored** → Safari bails here |
| Wrapper | `.city-navbar-wrapper` | `pointer-events: none` → restored to `auto` when active | Fixed in first pass — Chrome respects this; iOS does not |
| Nav | `<nav>` | `pointer-events: auto` (Tailwind class) | Never reached on iOS due to slot-level block |

**Chrome behaviour** (spec-compliant): child `pointer-events: auto` overrides ancestor `pointer-events: none`  
**iOS Safari behaviour** (non-compliant / known bug): stops DOM hit-test traversal at the first `pointer-events: none` ancestor regardless of child overrides; Chrome DevTools mock-mobile uses Chrome's engine so the bug is invisible there

#### Fixes Applied

**Pass 1** (wrapper level — `pointer-events: auto` on active wrappers): Merged to main; insufficient on iOS alone  
**Pass 2** (slot level — `pointer-events: auto` on the slot itself when active): Branch `session/060-profile-menu-fix` commit `a0f8379d`; restores the slot so no blocking ancestor exists in the hit-test path

```css
/* Pass 2 — slot level, committed a0f8379d */
.mobile-bottom-ui-slot[data-mobile-ui='footer'],
.mobile-bottom-ui-slot[data-mobile-ui='navbar'] {
  pointer-events: auto;
}
```

**Files changed**: `src/styles/globals.css` (both passes)

#### Impact Assessment
- **Stage 1/2 users**: Profile icon was non-functional on iOS (complete loss of account-entry path)
- **Stage 3 users**: Same wrapper pattern affected; Pass 2 also fixes `MobileFooterBar` on iOS
- **Desktop**: Unaffected
- **Android Chrome/Firefox mobile**: No issue (compliant engines)

#### Next Actions
1. ✅ Hotfix applied to branch `session/060-profile-menu-fix`
2. ⏳ Merge branch to `main` (compare URL: https://github.com/abu-lina/uflow/compare/main...session/060-profile-menu-fix)
3. ⏳ UAT deployment via GitHub Actions
4. ⏳ Re-validate D1 on real iOS device
5. ⏳ Validate D5 (new item: Stage 3 iOS touch events)

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-03-25T21:33Z | DevOps | Created tracker from UAT deferred validation items D1-D4 |
| 2026-03-26 | UAT | **CRITICAL**: D1 iOS validation failed; hotfix applied to globals.css; D1 reopened + D5 added for Stage 3 iOS regression |
