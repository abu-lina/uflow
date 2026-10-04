---
ID: 062
Origin: 062
UUID: c062f1a9
Status: Planned
---

# 062 — Profile Menu Click Issue Analysis

## Changelog

| Date (UTC) | Agent | Change | Summary |
|------------|-------|--------|---------|
| 2026-03-25 | Analyst | Initial analysis | Investigated profile menu click issue on mobile navigation |
| 2026-03-25T20:58Z | Planner | Status: Active -> Planned | Plan 062 created with inherited ID/Origin/UUID; analysis ready for closure |

---

## Value Statement and Business Objective

As a **mobile user**, I want **the profile menu icon in the bottom navigation to be clickable**, so that **I can access my profile settings and account management**.

---

## Objective

Determine why the profile menu icon in the bottom navigation is unresponsive to clicks.

---

## Context

User reports the profile menu icon in the bottom navigation bar is not clickable/responding. Screenshot shows:
- Mobile app with bottom navigation
- Provider card visible ("Halal Asia Delights") with "Speichern" (Save) button
- Category tabs "Essen & Trinken", "Gesundheit"
- Profile icon circled (purple) in bottom nav — visible but not responding

User hypothesis: The app needs to be declared as "fully launched" (`isAppLaunched: true`) since there are now >900 providers.

### Files Examined

| File | Observation |
|------|-------------|
| [src/components/common/MobileFooterBar.tsx](src/components/common/MobileFooterBar.tsx) | 5-item nav (Home, Explore, Create, Saved, Profile), fixed bottom:0 z-50, pointer-events-auto on nav |
| [src/components/shared/CityEarlyAccessNavbar.tsx](src/components/shared/CityEarlyAccessNavbar.tsx) | 2-3 item nav (Home, Create, optionally Saved) — **NO Profile icon**, fixed bottom:0 z-50 |
| [src/utils/navigationUtils.ts](src/utils/navigationUtils.ts) | `shouldShowMobileFooter`, `shouldShowCityEarlyAccessNavbar` — determines which nav is shown |
| [src/components/layout/RootClientLayout.tsx](src/components/layout/RootClientLayout.tsx) | Dual-slot architecture, CSS-controlled visibility via `data-mobile-ui` attribute |
| [src/styles/globals.css](src/styles/globals.css) | Slot and wrapper pointer-events:none, visibility toggling for navs |
| [src/hooks/useAppStage.ts](src/hooks/useAppStage.ts) | Determines Stage 1/2/3 based on isAppLaunched flag and provider count |
| [src/config/feature-flags.ts](src/config/feature-flags.ts) | `isAppLaunched: false` (current) |

### Prior Related Work

- **Plan 044 (v0.8.2)**: Fixed footer overlay blocking content by adding `pointer-events: none` to wrappers
- No changes to footer files since v0.8.2

---

## Methodology

1. Traced RootClientLayout component structure and nav rendering logic
2. Analyzed CSS for slot visibility and pointer-events management
3. Examined `shouldShowMobileFooter` and `shouldShowCityEarlyAccessNavbar` decision logic
4. Traced `useAppStage` hook determining Stage 1/2/3
5. Checked feature flags and their impact on navigation display

---

## Findings

### Finding 1: Dual Navigation Architecture (Verified — Confidence: Proven)

The app renders TWO different bottom navigation bars:

| Component | Icons | When Shown |
|-----------|-------|------------|
| `MobileFooterBar` | Home, Explore, Create, Saved, **Profile** | Stage 3 OR (Stage 1/2 + authenticated + onboarding complete) |
| `CityEarlyAccessNavbar` | Home, Create, (Saved in Stage 2) | Stage 1/2 + unauthenticated + onboarding complete |

**Critical observation**: `CityEarlyAccessNavbar` has **NO Profile icon**.

### Finding 2: Navigation Selection Logic (Verified — Confidence: Proven)

From `shouldShowMobileFooter`:

```typescript
// Stage 3 (Full Access): Show footer unconditionally
const isStage3 = isAppLaunched || stage === 'stage3';
if (isStage3) {
  return true;  // MobileFooterBar shown regardless of auth
}

// For Stages 1 & 2:
if (!user) {
  return false;  // Unauthenticated users → CityEarlyAccessNavbar
}
```

From `shouldShowCityEarlyAccessNavbar`:

```typescript
const isStage3 = isAppLaunched || stage === 'stage3';
if (isStage3) {
  return false;  // Never show in Stage 3
}

if (pathname === '/' && onboardingComplete) {
  return true;  // Unauthenticated users on root → CityEarlyAccessNavbar
}
```

### Finding 3: Stage Determination (Verified — Confidence: Proven)

From `useAppStage`:

| Condition | Stage |
|-----------|-------|
| `isAppLaunched = true` | Stage 3 |
| Provider count >= 15 in selected city | Stage 3 |
| Provider count 6-14 | Stage 2 |
| Provider count 0-5 | Stage 1 |

**Current configuration**: `isAppLaunched: false`, so stage depends on provider count.

### Finding 4: User Hypothesis Evaluation (Verified — Confidence: High)

User hypothesis: "The app needs to be declared as fully launched since there are >900 providers."

**Evaluation**: The hypothesis is **partially correct** but relies on misunderstanding:

1. If user has **900 providers globally** but their **selected city** has fewer than 15 approved providers → Stage could be 1 or 2
2. Stage is determined by **city-specific provider count**, not global count
3. In Stage 1/2 for **unauthenticated users**: `CityEarlyAccessNavbar` is shown (no Profile icon)
4. Setting `isAppLaunched: true` would force Stage 3 for all users → `MobileFooterBar` always shown (with Profile)

---

## Root Cause Analysis

### Primary Root Cause (Confidence: High)

**For unauthenticated users in Stage 1/2, the `CityEarlyAccessNavbar` is shown instead of `MobileFooterBar`. This navbar intentionally has NO Profile icon.**

The user may be:
1. **Unauthenticated** — early access users completing the flow don't have accounts
2. **In Stage 1 or 2** — their selected city has fewer than 15 approved providers

Evidence:
- If the user could SEE the profile icon (circled in screenshot), they would have MobileFooterBar
- If profile icon is visible but not clickable, there may be a secondary click-interception issue
- If the screenshot shows a navbar WITHOUT Profile icon, the user sees CityEarlyAccessNavbar

### Secondary Hypothesis: Click Interception (Confidence: Medium)

If MobileFooterBar IS showing (Profile icon visible), clicks might be blocked by:

1. **Visibility inheritance issue**: CityEarlyAccessNavbar inherits `visibility: hidden` from its wrapper when inactive, but both navs have `position: fixed; z-50`. Browser quirks might cause hidden fixed elements to intercept events.

2. **DOM order stacking**: CityEarlyAccessNavbar's wrapper appears AFTER MobileFooterBar's wrapper in DOM. At equal z-index, later DOM order wins for rendering, but visibility should prevent event capture.

**CSS analysis**:
```css
/* Both wrappers have pointer-events: none */
.mobile-bottom-ui-slot .mobile-footer-bar-wrapper,
.mobile-bottom-ui-slot .city-navbar-wrapper {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}

/* Only active wrapper gets visibility: visible */
/* BUT pointer-events stays as none (inherited) */
.mobile-bottom-ui-slot[data-mobile-ui='footer'] .mobile-footer-bar-wrapper {
  visibility: visible;  /* No pointer-events override! */
}
```

The nav elements inside have `pointer-events-auto` which should restore clickability.

---

## System Weaknesses Identified

### Architectural

| Weakness | Risk | Mechanism |
|----------|------|-----------|
| **Dual navigation with missing features** | UX confusion | CityEarlyAccessNavbar lacks Profile, Explore icons that users expect |
| **Authentication-dependent profile access** | Access barrier | Unauthenticated early-access users cannot access any profile functionality |
| **City-specific staging vs global awareness** | Expectation mismatch | Admin sees 900 global providers but user's city may have few |

### Code-Level

| Weakness | Risk | Detection |
|----------|------|-----------|
| **Implicit nav selection via visibility** | Click blocks | Hard to debug which nav is "active" without inspecting data-mobile-ui |
| **No Profile in early access nav** | Feature gap | Users complete onboarding but can't manage their profile |

---

## Instrumentation Gaps

### Normal Telemetry (Always-On)

| Event | Fields | Purpose |
|-------|--------|---------|
| `nav_click_attempted` | `icon`, `timestamp`, `nav_type`, `auth_status`, `stage` | Track click attempts for all nav icons |
| `nav_display_state` | `data_mobile_ui`, `show_mobile_footer`, `show_city_navbar`, `stage`, `auth_status` | Log which nav is active on page load |

### Debug Telemetry (Opt-In)

| Event | Fields | Purpose |
|-------|--------|---------|
| `dom_element_stack` | `x`, `y`, `elements_at_point[]` | Capture full element stack at click coordinates for hit-testing diagnosis |

---

## Analysis Recommendations

### Immediate Investigation Steps

1. **Confirm user authentication status**: If unauthenticated → CityEarlyAccessNavbar is by design
2. **Confirm user's selected city provider count**: If < 15 → Stage 1/2 (expected behavior)
3. **Test with `isAppLaunched: true`**: This will force Stage 3 and MobileFooterBar for all users
4. **Browser dev tools**: Inspect `data-mobile-ui` attribute on `.mobile-bottom-ui-slot` to confirm active nav

### Debug Procedure (For User Reproduction)

```javascript
// Paste in browser console on affected page
console.log({
  'data-mobile-ui': document.querySelector('.mobile-bottom-ui-slot')?.dataset.mobileUi,
  'footer-visible': document.querySelector('.mobile-footer-bar-wrapper')?.style.visibility,
  'navbar-visible': document.querySelector('.city-navbar-wrapper')?.style.visibility,
  'stage': localStorage.getItem('selectedCity'),
  'auth': document.cookie.includes('sb-') ? 'authenticated' : 'unauthenticated'
});
```

---

## Open Questions

1. **Is the user authenticated?** — Critical to determine which nav should display
2. **What is the provider count for the user's selected city?** — Determines Stage
3. **Is the profile icon actually visible or absent?** — Confirms which nav is rendering
4. **Screenshot clarification**: Does the circled area show a profile icon or empty space?

---

## Summary

| Aspect | Finding |
|--------|---------|
| **Primary root cause** | Unauthenticated Stage 1/2 users see `CityEarlyAccessNavbar` which has NO Profile icon |
| **User hypothesis validity** | Partially correct — `isAppLaunched: true` would fix by forcing Stage 3 (MobileFooterBar for all) |
| **Confidence** | High for primary cause; Medium for click-interception secondary cause |
| **Fix direction** | Either add Profile icon to CityEarlyAccessNavbar, OR allow Profile in early access for all users |
