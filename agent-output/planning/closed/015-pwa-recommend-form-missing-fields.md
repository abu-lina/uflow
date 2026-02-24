---
ID: 015
Origin: 015
UUID: 7b2f3c1a
Status: Released
---

# Plan 015 — PWA "Anbieter empfehlen" missing input fields (Xiaomi 13T Pro)

**Target Release**: v0.6.1  
**Epic Alignment**: Reliability / Mobile UX parity (bugfix; supports Master Product Objective by preventing drop-off at recommendation entrypoint)  
**Status**: UAT Approved

## Change Log

| Date (UTC)        | Agent         | Change                                 | Rationale                                                                                                                            |
| ----------------- | ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-02-23        | planner       | Plan created                           | Address Xiaomi/MIUI PWA rendering bug with minimal, safe CSS/layout changes                                                          |
| 2026-02-23        | code-reviewer | Status updated to Code Review Approved | Implementation reviewed — APPROVED, ready for QA                                                                                     |
| 2026-02-23T12:55Z | uat           | Status updated to UAT Approved         | UAT Complete — implementation delivers stated value, CSS viewport + layout fixes address root causes, APPROVED FOR RELEASE as v0.6.1 |

## Value Statement and Business Objective

As a **PWA user on Android (MIUI/Xiaomi)**, I want the **“Anbieter empfehlen” form to reliably display all input fields**, so that I can **recommend a provider without being blocked by a blank screen**, increasing successful submissions and trust in the app.

## Objective

Ship a small, low-risk UI/layout fix so that on **Xiaomi 13T Pro (PWA standalone)** the page at `/create/recommend` shows the full form (city, provider name, category, contact, message) and remains usable.

## Target Release Rationale

- This is a user-blocking regression/compat issue, best shipped as a **patch** after v0.6.0.
- Roadmap shows no active working release; treat as **v0.6.1** pending Roadmap agent confirmation.

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

## Current Findings (from Analyst Investigation)

- Form component renders all sections unconditionally; the issue is very likely **layout/CSS/viewport sizing** in MIUI WebView.
- High-probability culprit: `.h-screen-fix { height: 100vh; height: -webkit-fill-available; }` overriding `100vh` with a value that can collapse in Android PWA standalone.
- Secondary risk: nested scroll containers with `absolute inset-0 overflow-y-auto` in `ScrollablePageLayout` + `main overflow-y-auto`.
- Tertiary risk: PWA service worker caching stale JS/CSS (less likely but must be ruled out).

## Assumptions

- The device is using MIUI WebView / Chromium in **installed PWA standalone** mode (`display-mode: standalone`).
- The bug is reproducible on at least one MIUI device or emulator with comparable WebView behavior.

## OPEN QUESTIONS

- **OPEN QUESTION**: Is the blank area due to container height collapse (`-webkit-fill-available`) or due to nested scrolling/absolute positioning?
- **OPEN QUESTION**: Does the issue reproduce in **Chrome browser (non-PWA)** on the same device, or only when installed as PWA?

## Plan

1. **Reproduce + capture evidence (dev tools)**
   - Reproduce on Xiaomi 13T Pro if available.
   - Collect: computed `height` of the root `.h-screen-fix` container, scroll container heights, and whether `ScrollablePageLayout` has non-zero height.
   - Confirm whether the issue occurs only in `display-mode: standalone`.
   - Acceptance: a short note in PR description with screenshots of computed layout before/after.

2. **Fix viewport height utility to avoid MIUI collapse**
   - Update `h-screen-fix` in `src/styles/globals.css` to avoid `-webkit-fill-available` overriding `100vh` on Android.
   - Preferred approach: keep safe iOS behavior while preventing Android override (e.g., use `@supports (-webkit-touch-callout: none)` gating, or prefer `100dvh` where supported).
   - Acceptance: `.page-background` container has stable, non-zero height in PWA standalone on Xiaomi.

3. **Reduce scroll-container ambiguity for create/recommend pages**
   - Ensure the `absolute inset-0` scroll container has a correct containing block and doesn’t rely on a higher ancestor’s height.
   - Options (choose minimal):
     - Make the immediate parent (`PageTransition` wrapper or `main`) a positioned container (`relative`) and/or ensure it has definite height.
     - Alternatively, adjust `ScrollablePageLayout` to avoid absolute positioning on small screens.
   - Acceptance: full form is visible and scrollable on Xiaomi; no regression in iOS Safari and desktop.

4. **Service worker/cache sanity check**
   - Ensure the deployed build updates correctly in PWA: confirm the user can get the latest assets (e.g., by SW update flow).
   - If needed, add a lightweight cache-bust or update prompt behavior (keep minimal).
   - Acceptance: “hard refresh” equivalent is not required for the user to see the fix after update.

5. **Regression verification (developer-run)**
   - Verify on:
     - Android Chrome (browser mode)
     - Android PWA standalone
     - iOS Safari/PWA (if applicable)
     - Desktop
   - Acceptance: form fields render and are usable; no layout shift that hides inputs; submit still works.

6. **Update Version and Release Artifacts**
   - Bump version to `v0.6.1` in the repo’s version source of truth (as used by DevOps).
   - Add `CHANGELOG.md` entry referencing Plan 015.
   - Acceptance: version artifacts and changelog reflect the fix; ready for bundling into the next release.

## Validation (Engineering)

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build` (to ensure PWA build artifacts still generate correctly)

## Testing Strategy (High-Level)

- Unit-level: minimal/no new unit tests expected (CSS/layout).
- Integration-level: validate rendered DOM contains expected input elements for recommend form.
- Manual: device validation on at least one Android PWA standalone environment; verify scrolling and focus behavior.

## Risks and Mitigations

- **Risk**: Changing viewport sizing impacts iOS Safari.
  - Mitigation: gate iOS-specific hacks with feature queries; verify on iOS.
- **Risk**: Adjusting scroll containers affects PageHeader blur behavior.
  - Mitigation: restrict changes to create/recommend path or smallest shared primitive.
- **Risk**: SW caching prevents users from receiving the fix promptly.
  - Mitigation: confirm update behavior and keep caching strategy aligned with next-pwa defaults.

## Rollback

- Revert CSS/layout changes; deploy patch rollback if other devices regress.

## Duration Estimates

- Analysis / Reproduction: 1–4 hours (depends on device access)
- Planning (this doc): complete
- Implementation: 2–6 hours
- QA validation (engineering checks + device): 2–6 hours
- UAT: 0.5–2 hours
- DevOps / release: 0.5–2 hours

Key uncertainty driver: ability to reproduce on MIUI PWA reliably.
