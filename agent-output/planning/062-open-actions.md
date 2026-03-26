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
**Status**: Hotfix applied, pending merge + UAT deployment verification

#### Symptom
Profile icon in `CityEarlyAccessNavbar` visible but unresponsive to touch on real iOS devices. Desktop Chrome DevTools mobile emulation showed no issue.

#### Root Cause
Parent wrapper div (`.city-navbar-wrapper` in `src/styles/globals.css` lines 447-457) had `pointer-events: none` that was never restored when the wrapper became visible. iOS WebKit does not allow child elements with `pointer-events: auto` to override parent `pointer-events: none`, unlike Chrome's rendering engine.

#### Fix Applied
Added `pointer-events: auto;` to both active wrapper rules in `globals.css`:
- `.mobile-bottom-ui-slot[data-mobile-ui='footer'] .mobile-footer-bar-wrapper`
- `.mobile-bottom-ui-slot[data-mobile-ui='navbar'] .city-navbar-wrapper`

**Files changed**: `src/styles/globals.css` (lines 453-457)

#### Impact Assessment
- **Stage 1/2 users**: Profile icon was non-functional on iOS (complete loss of account-entry path)
- **Stage 3 users**: Likely also affected (same wrapper pattern used for `MobileFooterBar`)
- **Desktop users**: No impact
- **Android Chrome/Firefox mobile**: Unknown - requires verification

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
