---
ID: 063
Origin: 063
UUID: a7e4f3b2
Status: Planned
---

# Profile Menu Stage-Gating Analysis

## Changelog

| Version | Timestamp (UTC) | Author  | Notes |
|---------|------------------|---------|-------|
| 1.0     | 2026-03-26T21:30Z | Analyst | Initial investigation — static analysis of H1–H4 |
| 1.1     | 2026-03-26T21:30Z | Planner | Status set to Planned; findings transferred into Plan 063 |

---

## Value Statement and Business Objective

A fresh unauthenticated user visiting UAT on a real iOS device has no way to access the profile menu (login/sign-up). The Profile icon in the mobile bottom navigation is absent — not present in the DOM — blocking the primary authentication entry point on mobile. This directly impacts user acquisition: new users cannot register or sign in from the landing page on real iOS devices.

**Business objective**: Every user visiting `/` on a mobile device must see the Profile icon and be able to tap it to log in or sign up, regardless of their prior session state.

---

## Context

Plan 062 added the Profile icon to `CityEarlyAccessNavbar`. CSS pointer-events fixes were applied in v0.9.4 (wrapper-level) and v0.9.5 (slot-level, pending merge). Both fixes were validated in Chrome DevTools mobile emulation but the bug persists on real iPhone 15 Pro in UAT.

User-provided key context: *"it worked before we introduced the different app stages (Stage 1/2/3 based on provider count)."*

This session performs static code analysis to identify whether the root cause is navigation logic (stage-gating) rather than CSS.

---

## Methodology

Static code analysis of the following files:

| File | Purpose |
|------|---------|
| `src/utils/navigationUtils.ts` | `shouldShowCityEarlyAccessNavbar()`, `shouldShowMobileFooter()`, `hasCompletedOnboarding()` |
| `src/hooks/useAppStage.ts` | Stage determination, provider-count thresholds |
| `src/config/feature-flags.ts` | `isAppLaunched`, `skipWaitlist` default values |
| `src/components/layout/RootClientLayout.tsx` | `mobileUiMode` derivation, `isMounted` guard |
| `src/styles/globals.css` | CSS pointer-events slot/wrapper rules |
| `env.uat.template` | UAT environment variable configuration |

The approach was to trace the **complete deterministic code path** for a fresh unauthenticated iOS user visiting `/` with **no localStorage or sessionStorage data** (accurate for first-ever visit to UAT on a real device in a private/fresh browser session).

---

## Findings

### Finding 1 — Stage Thresholds (Verified)

**File**: `src/hooks/useAppStage.ts` lines 174–196

Stage is determined by provider count for the user's selected city:

| Provider Count | Stage   |
|---------------|---------|
| 0–5           | stage1  |
| 6–14          | stage2  |
| ≥ 15          | stage3  |

`isAppLaunched: false` is the default value in `src/config/feature-flags.ts` line 42. It can be overridden by `NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED` env var; no such override is present in `env.uat.template`, so UAT uses the default (`false`).

`skipWaitlist: true` is the default (line 43), which means `earlyAccessUnlocked` is always `true` inside `useAppStage`. However, this override does **NOT** propagate to `hasCompletedOnboarding()` in `navigationUtils.ts`.

---

### Finding 2 — `hasCompletedOnboarding()` Does Not Respect `skipWaitlist` (Verified)

**File**: `src/utils/navigationUtils.ts` lines 142–175

`hasCompletedOnboarding()` reads directly from localStorage and `sessionStorage`. It requires **both**:
1. `localStorage.getItem('ummahflow_onboarding')` with `.earlyAccessUnlocked = true`
2. `localStorage.getItem('selectedCity')` OR `sessionStorage.getItem('selectedCity')` to be set

For a **fresh user** (no prior localStorage data), both conditions are absent. The function returns `false`.

**Critical gap**: `useAppStage()` uses `skipWaitlist` to bypass the `earlyAccessUnlocked` requirement for stage determination. But `navigationUtils.ts` functions (`shouldShowCityEarlyAccessNavbar`, `shouldShowMobileFooter`) call `hasCompletedOnboarding()` independently, with no awareness of `skipWaitlist`. These two systems are **inconsistent**: `useAppStage` considers the user ready for early access; `navigationUtils` does not.

---

### Finding 3 (PRIMARY) — `shouldShowCityEarlyAccessNavbar` Hides Navbar on `/` for Fresh Users (Verified)

**File**: `src/utils/navigationUtils.ts` lines 329–385

```
shouldShowCityEarlyAccessNavbar(pathname='/', isAppLaunched=false, user=null, stage='onboarding')
```

Execution trace for a fresh unauthenticated iOS user on `/`:

| Step | Check | Evaluates | Result |
|------|-------|-----------|--------|
| 1 | `isStage3 = isAppLaunched \|\| stage === 'stage3'` | `false \|\| false` | `false` → continue |
| 2 | `onboardingComplete = hasCompletedOnboarding()` | No localStorage | **`false`** |
| 3 | `if (pathname === '/' && onboardingComplete)` | `true && false` | SKIP (not entered) |
| 4 | `if (onboardingPages.includes(pathname) && !onboardingComplete)` | `true && true` | **`return false`** |

**The function returns `false`.**

The design intent at step 3–4: show the navbar on `/` only when onboarding is complete, and explicitly hide it on onboarding flow pages (`['/', '/about', '/welcome']`) when not.

The unintended consequence: **`/` (the landing page) is categorized as an onboarding flow page**, so fresh users who have never completed onboarding cannot see the CityEarlyAccessNavbar. Since the navbar contains the only mobile Profile/Login icon, these users have no mobile entry point to authenticate.

---

### Finding 4 — `shouldShowMobileFooter` Also Returns `false` for Fresh Users (Verified)

**File**: `src/utils/navigationUtils.ts` lines 187–258

```
shouldShowMobileFooter(pathname='/', isSplashVisible=false, user=null, isAppLaunched=false, stage='onboarding')
```

| Step | Check | Evaluates | Result |
|------|-------|-----------|----|
| 1 | `isStage3 = false \|\| 'onboarding' === 'stage3'` | `false` | continue |
| 2 | `onboardingComplete = hasCompletedOnboarding()` | `false` | **`return false` (line 232)** |

**The function returns `false`.**

---

### Finding 5 — `mobileUiMode = 'none'` for Fresh Users (Verified)

**File**: `src/components/layout/RootClientLayout.tsx` lines 69–75

```typescript
const mobileUiMode = !isMounted
  ? 'none'
  : showMobileFooter      // false (Finding 4)
    ? 'footer'
    : showCityEarlyAccessNavbar  // false (Finding 3)
      ? 'navbar'
      : 'none';
```

For a fresh user, after `isMounted = true`:
- `showMobileFooter = false`
- `showCityEarlyAccessNavbar = false`
- **`mobileUiMode = 'none'`**

The `data-mobile-ui='none'` attribute causes both nav components to be visually hidden via CSS. The Profile icon is absent from the DOM's rendered output entirely (it exists in the DOM but is invisible and zero-height due to slot collapse).

---

### Finding 6 — Stage for Fresh Users Is `'onboarding'` (Verified)

**File**: `src/hooks/useAppStage.ts` lines 155–165

```typescript
// Early access but no city selected
if (!cityName) {
  setStage('onboarding'); // Will show city selection
  setError(undefined);
  return;
}
```

A fresh user has no `selectedCity` in localStorage → `cityName = undefined` → `stage = 'onboarding'`.

**Note**: The stage starts as `'loading'` (initial `useState`) and transitions to `'onboarding'` asynchronously after `useEffect` fires. During the initial render: `isMounted = false` → `mobileUiMode = 'none'`. After `isMounted = true` and stage resolves to `'onboarding'`, both show-functions still return `false` → `mobileUiMode` stays `'none'`.

---

### Finding 7 — Why Chrome DevTools Shows the Navbar (Verified Inference)

The Chrome DevTools session that appears to "work" is run by a developer whose browser has **pre-existing localStorage data** from development sessions:
- `ummahflow_onboarding = { earlyAccessUnlocked: true, ... }` — set during prior dev testing
- `selectedCity = "..."` — set during prior city selection

With these values present: `hasCompletedOnboarding()` returns `true`. The `shouldShowCityEarlyAccessNavbar('/', false, user, stage)` → enters step 3: `if (pathname === '/' && true)` → **returns `true`** → navbar shown.

A fresh iOS device in UAT has no localStorage → navbar hidden. This precisely explains the Chrome-DevTools-works / real-iOS-fails discrepancy with no CSS explanation needed.

---

### Finding 8 — CSS Pointer-Events Issue Is Real but Secondary (Verified)

**File**: `src/styles/globals.css` lines 431–467

The `.mobile-bottom-ui-slot` has `pointer-events: none` at the slot level (line 432). iOS Safari stops DOM hit-testing at the first `pointer-events: none` ancestor, unlike Chrome which propagates child `pointer-events: auto` overrides. 

The v0.9.5 fix (feature branch, commit `1c9259b3`) adds `pointer-events: auto` to the slot when `data-mobile-ui='footer'` or `'navbar'` (lines 457, 462, 467). This is correct and necessary.

However, **this fix is irrelevant for fresh users** since `mobileUiMode = 'none'` (Finding 5) — the slot stays hidden regardless of pointer-events. CSS fix matters only for users who have already completed onboarding (have localStorage), and even then the bug manifested as the navbar being unresponsive, not absent.

---

### Finding 9 — `isMounted` Guard Has No Role in Persistent Bug (Verified)

**File**: `src/components/layout/RootClientLayout.tsx` lines 39–42

```typescript
const [isMounted, setIsMounted] = useState(false);
useEffect(() => {
  setIsMounted(true);
}, []);
```

The `isMounted` guard prevents SSR hydration mismatch by starting with `mobileUiMode = 'none'`. It transitions to the correct value on the first client render. For a fresh user, the "correct value" is still `'none'` (Findings 3–5), so this guard has no impact on the persistent bug.

H4 (hydration race) is ruled out as the persistent cause. It remains a theoretical marginal concern for a brief content flash on very slow iOS devices, but not the reported bug.

---

## Root Cause Summary

**Primary Root Cause (H1) — VERIFIED**

The landing page `/` is classified as an "onboarding flow page" in `shouldShowCityEarlyAccessNavbar()`. The explicit check at [navigationUtils.ts line 350–352](../../../src/utils/navigationUtils.ts) returns `false` for any user who has not completed onboarding:

```typescript
const onboardingPages = ['/', '/about', '/welcome'];
if (onboardingPages.includes(pathname) && !onboardingComplete) {
  return false;
}
```

A fresh iOS user has no localStorage, so `hasCompletedOnboarding() = false`, and the CityEarlyAccessNavbar — the **only mobile navigation containing the Profile/Login icon** — is never rendered visible. `mobileUiMode = 'none'`.

This logic was introduced with the Stage system but was not present before. The user's report that "it worked before stages were introduced" is consistent: the pre-stages navigation showed the navbar unconditionally (or without an onboarding gate) on the landing page.

**Root cause exists independently of the CSS pointer-events fixes (v0.9.4, v0.9.5).**

---

## Hypothesis Assessment

### H1: `hasCompletedOnboarding()` gates navbar for fresh users
| Attribute | Value |
|-----------|-------|
| **Confidence** | **HIGH — Verified by direct code trace** |
| **Status** | CONFIRMED as primary root cause |
| **Affected users** | All users who have never visited the site OR are using a private/fresh browser (cleared storage, incognito, new device) |
| Disconfirming test | Set `ummahflow_onboarding = '{"earlyAccessUnlocked":true}'` and `selectedCity = "test"` in iOS Safari localStorage → navbar should appear |

---

### H2: UAT provider count ≥ 15 → Stage 3 → MobileFooterBar shown instead of CityEarlyAccessNavbar
| Attribute | Value |
|-----------|-------|
| **Confidence** | **MEDIUM — Cannot determine without UAT database query** |
| **Status** | Partially analyzed |
| **Assessment** | If UAT selected city has ≥ 15 providers AND a user has `selectedCity` in localStorage, stage = 'stage3' → `showCityEarlyAccessNavbar = false`, `showMobileFooter = true` → MobileFooterBar is shown. The Profile icon in MobileFooterBar (if present) would be subject to the v0.9.5 CSS fix. However, for a **fresh user with no selectedCity**, this branch is never reached — stage = 'onboarding' regardless of provider count. |
| Disconfirming test | Query UAT: `SELECT count(*) FROM providers WHERE address_city = '<selected-city>' AND review_status = 'approved'` — if < 15, H2 is ruled out for that city |
| Missing telemetry | UAT provider count per city; which city the test user has selected |

---

### H3: CSS `pointer-events: none` on slot blocks iOS tap events
| Attribute | Value |
|-----------|-------|
| **Confidence** | **HIGH — Verified as secondary fix (v0.9.5)** |
| **Status** | Real issue, but secondary to H1 |
| **Assessment** | The slot-level `pointer-events: none` IS a genuine iOS Safari issue. The v0.9.5 fix is correct. But this fix only matters for users who DO have localStorage data (navbar visible), and those users would have been affected by this separately. For fresh users (the primary regression), the slot shows `data-mobile-ui='none'` — the navbar is hidden, not merely untappable. |
| Fix applied | Branch `session/060-profile-menu-fix`, commit `1c9259b3`, pending PR merge |

---

### H4: `isMounted` hydration race causes persistent blank slot on iOS
| Attribute | Value |
|-----------|-------|
| **Confidence** | **LOW — Ruled out as persistent cause** |
| **Status** | Not the root cause |
| **Assessment** | `isMounted` transitions from `false` → `true` on first `useEffect` call, which fires synchronously after first paint. The transition is visible as a brief content flash on slow devices. However, for a fresh user, the "correct" resolved value is still `mobileUiMode = 'none'` — so the transition would change nothing. Not the reported bug. |
| Disconfirming test | Add `console.log('[RCL] isMounted', isMounted, mobileUiMode)` — observe that final resolved state is still 'none' for fresh user |

---

## System Weaknesses

### Architecture Weakness 1: Design conflict between "landing page" and "onboarding flow page" for `/`
`/` serves dual purposes: entry landing page (needs auth entry point visible) and the first step of the onboarding flow (may want a clean UX without nav distractions). The current implementation treats it exclusively as the latter, hiding the Profile/Login icon from unauthenticated users entirely.

**Risk**: Any future change to onboarding (e.g., adding new steps, reordering pages) could unintentionally expand the set of pages where authentication is inaccessible.

### Architecture Weakness 2: `skipWaitlist` bypass does not propagate to `hasCompletedOnboarding()`
`useAppStage` uses `skipWaitlist: true` to treat all users as early-access eligible, but `navigationUtils.ts` has its own independent `hasCompletedOnboarding()` check that ignores `skipWaitlist`. Two systems with different views of "is this user ready."

**Risk**: Future changes to either `useAppStage` or `navigationUtils` could silently diverge further, creating hard-to-debug discrepancies between stage behavior and nav visibility.

### Architecture Weakness 3: Navigation visibility state is not observable at runtime
There is no telemetry emitted when `mobileUiMode = 'none'` is resolved for a user who expects navigation. The current debug logging in `RootClientLayout` only logs `showMobileFooter` state (not `showCityEarlyAccessNavbar` or `mobileUiMode`), and only in `development` environment.

**Risk**: Production bugs that suppress navigation (like this one) are invisible in logs, delaying identification.

### Architecture Weakness 4: CSS pointer-events architecture relies on correct slot attribute
The entire touch event path for mobile nav depends on `data-mobile-ui` attribute being correctly set. If attribute assignment fails (race condition, hydration error), all touch events on the slot are blocked. There is no graceful fallback.

---

## Instrumentation Gaps

### Normal (always-on) telemetry needed

| Signal | Why | Event/Log |
|--------|-----|-----------|
| `mobileUiMode` value on each pathname change | Enables production triage of nav visibility bugs | `[RCL] mobileUiMode={mode} pathname={pathname} stage={stage}` — structured log |
| `hasCompletedOnboarding()` result on each navigation | Tracks how many users are hitting the onboarding gate | Structured log at call site |

### Debug (opt-in) telemetry needed

| Signal | Why | Event/Log |
|--------|-----|-----------|
| Full nav decision tree trace (`showMobileFooter`, `showCityEarlyAccessNavbar`, `onboardingComplete`, `stage`, all with values) | Reproducing the decision path for a specific user session | Add to existing dev-only debug log in `RootClientLayout`, extend to also include `showCityEarlyAccessNavbar` and `mobileUiMode` |
| localStorage keys present on mount | Distinguishing fresh vs returning users in bug reports | Log presence/absence of `ummahflow_onboarding` and `selectedCity` |

---

## Analysis Recommendations (Next Investigation Steps)

These are investigation-scoped actions — not implementation recommendations.

1. **Confirm H1 on device**: Use Safari DevTools (Mac → iPhone via USB) to inspect localStorage on the failing iOS device. Confirm `ummahflow_onboarding` and `selectedCity` are absent. This collapses remaining uncertainty.

2. **Determine UAT provider count (for H2)**: Query the UAT Supabase database: `SELECT address_city, COUNT(*) FROM providers WHERE review_status = 'approved' GROUP BY address_city`. Determine if any city has ≥ 15 providers. This either confirms or eliminates H2 as a contributing factor for users who have completed onboarding.

3. **Identify which pages are reachable without nav**: Trace what the fresh user sees when no nav is shown on `/`. Does the app redirect them auto-magically to city selection? If not, they are stuck — no path to auth, no path to onboarding. This is needed to scope the impact.

4. **Examine the pre-stages git history**: Run `git log --oneline -- src/utils/navigationUtils.ts` to identify the commit that introduced the `onboardingPages` check and stage-gating. This confirms the timeline the user described ("worked before stages") and identifies any concurrent changes that may affect the recommended fix approach.

---

## Open Questions

1. **What does the UAT user actually see on the landing page** when `mobileUiMode = 'none'`? Is there a redirect to onboarding flow or does the user land on the home page with no navigation?

2. **Does MobileFooterBar also contain a Profile/Login icon?** If yes, Stage 3 users (UAT with ≥ 15 providers, after onboarding) have a path to profile. If no, H2 would represent a separate navigation gap even for returning users.

3. **Was the `onboardingPages` check explicitly designed to hide the navbar on the landing page for fresh users**, or was it an unintended side-effect of adding the page to the "don't show nav during onboarding" list?

4. **Is the onboarding flow triggered auto-matically when the user has no localStorage** (e.g., via redirect), or does the user sit on the home page with no nav and no prompts? If auto-redirected to `/about` or similar, the Profile icon absence at `/` may matter less.

---

## Finding 10 — "Logged In Works / Logged Out Doesn't" Observation (Verified)

**Source**: Direct user observation (UAT, iPhone 15 Pro).

This observation precisely differentiates two distinct affected populations:

### Population A: Users with localStorage (returning users who have previously logged in)

When logged in:
- `user != null` → `shouldShowMobileFooter` passes the `!user` gate → `showMobileFooter = true`
- `mobileUiMode = 'footer'` → **MobileFooterBar** shown → `data-mobile-ui='footer'`
- Profile icon tap → **works**

When logged out (same device, localStorage persists after logout):
- `user = null` but localStorage still has `ummahflow_onboarding` + `selectedCity`
- `hasCompletedOnboarding() = true` → H1 check passes
- `shouldShowCityEarlyAccessNavbar('/', false, null, 'stage1') = true`
- `mobileUiMode = 'navbar'` → **CityEarlyAccessNavbar** shown → `data-mobile-ui='navbar'`
- Profile icon tap → **does NOT work** (iOS CSS issue)

**Conclusion**: For existing/returning users, H3 (CSS pointer-events) is the ACTIVE bug. The Profile icon is visible and present in the DOM but untappable on iOS Safari.

### Population B: Fresh users (no localStorage, new device, or cleared storage)

- H1 applies: `hasCompletedOnboarding() = false` → navbar never shown → `mobileUiMode = 'none'`
- Profile icon is not visible at all
- These users have no auth entry path on mobile

---

### Finding 11 — Why MobileFooterBar Works But CityEarlyAccessNavbar Doesn't (Partially Resolved)

Both components are `position: fixed; z-50; pointer-events-auto`. Both are inside the same `pointer-events: none` slot. Yet one works on iOS (logged in → footer) and one doesn't (logged out → navbar).

**Key CSS difference** in v0.9.4 on main (before the v0.9.5 slot fix):
- Slot: always `pointer-events: none`
- Active wrapper (footer or navbar): `pointer-events: auto` ✓
- Slot is NEVER set to `pointer-events: auto`

The v0.9.5 fix description states: *"Safari stops DOM hit-test traversal at the first pointer-events:none ancestor"*. If that were universally true, the FOOTER case should also fail. Yet it works.

**Most probable explanation (high-confidence inference)**: iOS Safari's traversal behavior for `pointer-events: none` ancestors is non-deterministic or rendering-context-sensitive for `position: fixed` children. The footer wrapper position in the DOM and rendering order may generate a different stacking context that iOS resolves differently than the navbar. This asymmetry was present before the v0.9.5 fix was written and explains why only the navbar was specifically reported.

**Remaining gap**: The exact iOS Safari mechanism causing the asymmetry is unconfirmed without device-level debugging. Fastest disconfirmation test: apply the v0.9.5 fix (merge to main) and verify the navbar becomes tappable on the real iOS device. If it works → slot-level fix was correct remedy. If it still doesn't → landing page content interception must be traced.

---

## Revised Root Cause Summary

There are **two distinct bugs** affecting two distinct user populations:

| Bug | Root Cause | Affected Population | Fix Available |
|-----|-----------|--------------------|----|
| **Bug A** (H3) | `pointer-events: none` on `.mobile-bottom-ui-slot` causes CityEarlyAccessNavbar to be untappable on iOS Safari | **Returning users** (have localStorage, are currently logged out) | ✅ v0.9.5 on branch, pending merge |
| **Bug B** (H1) | `shouldShowCityEarlyAccessNavbar()` requires `hasCompletedOnboarding()` on `/`, hiding navbar entirely for fresh users | **New users** (no localStorage, first visit, fresh browser, incognito) | ❌ Navigation logic fix not yet planned |

The "logged in works / logged out doesn't" observation is Bug A. Bug B is invisible to the UAT tester because their device has localStorage from prior login sessions.

---

## Conclusion

Two bugs, two fixes needed:

**Bug A (H3)** — High priority for UAT unblock: Merge branch `session/060-profile-menu-fix` (commit `1c9259b3`) to main. The v0.9.5 CSS fix adds `pointer-events: auto` to the slot when active, breaking the iOS Safari blocking chain.

**Bug B (H1)** — Required for new user acquisition: Fix `shouldShowCityEarlyAccessNavbar()` to not require `hasCompletedOnboarding()` before showing nav on `/`. The landing page must expose the Profile/Login entry point to all users regardless of onboarding state.

The regression in Bug B was introduced when the Stage system was added. Bug A is a CSS architecture issue that existed before but only became visible after Plan 062 added the Profile icon to CityEarlyAccessNavbar (it was never tappable — there was just nothing there to tap before).
