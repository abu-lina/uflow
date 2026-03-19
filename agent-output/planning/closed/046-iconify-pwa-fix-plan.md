---
ID: 046
Origin: 046
UUID: 3a7f1c2e
Status: Committed
---

# Plan 046 — Iconify PWA service-worker intercept fix

**Target Release**: v0.8.6
**Epic Alignment**: Technical Foundation & Reliability; provider detail discovery/contact/share reliability
**Status**: Committed
**Related Issues**: Session S046 (`046-iconify-pwa-fix`), provider detail page icon rendering defect on `/providers/[id]`

## Release Strategy

Standalone (no other known active plans targeting v0.8.4 in `agent-output/planning/`).

## Changelog

| Date (UTC) | Agent | Change | Rationale |
| --- | --- | --- | --- |
| 2026-03-19 | planner | Created plan | Translate verified ServiceWorker/Iconify analysis into implementation-ready work for next patch release |
| 2026-03-19 | implementer | Status → In Progress | Starting implementation of next.config.js PWA config fix |
| 2026-03-19 | implementer | Status → Implementation Complete | Fix applied; 5 regression tests green; 261/261 suite pass; build validated; package.json 0.8.4; CHANGELOG written |
| 2026-03-19 | code-reviewer | Status → Code Review Approved | APPROVED — no CRITICAL/HIGH/MEDIUM findings; 2 LOW observations; QA focus areas documented |
| 2026-03-19 | qa | Status → QA Failed | Automated gates pass for the PWA fix, but `package-lock.json` still reports 0.8.3 so version artifacts are inconsistent with the v0.8.4 release target |
| 2026-03-19 | implementer | QA fix: package-lock.json aligned | Ran `npm install --package-lock-only`; both root entries now report 0.8.4 |
| 2026-03-19 | qa | Status → QA Complete | Re-tested the fixed lockfile; release artifacts now align to 0.8.4; browser-backed PWA validation remains deferred to UAT |
| 2026-03-19T11:30Z | uat | Status → UAT Approved | APPROVED FOR RELEASE — all automated gates pass; SW artifact confirms failure chain broken; 5 deferred follow-ups (DF-1–5) documented with owner and trigger |
| 2026-03-19T11:35Z | devops | Status → Committed | Stage 1 committed locally for v0.8.4; lifecycle docs closed |

## Value Statement and Business Objective

As a **service seeker viewing a provider detail page**, I want to **see working share, web, phone, and Instagram icons even when the PWA service worker is active**, so that **provider pages feel trustworthy and I can complete contact/share actions without broken UI or hidden failures**.

## Objective

Restore reliable Iconify icon rendering on `/providers/[id]` by correcting the `@ducanh2912/next-pwa` v10 configuration, preventing service-worker interception of Iconify CDN API requests, and preserving existing offline/PWA behavior for supported assets.

This plan directly supports the Master Product Objective by reducing client-side failures on a high-trust discovery surface. It also aligns with the roadmap's reliability goal for faster and more dependable provider discovery experiences.

## Context

- Analysis 046 verified that `next.config.js` uses pre-v10 `next-pwa` option placement.
- Because `runtimeCaching` is currently ignored, the default Workbox `!sameOrigin` `NetworkFirst` route intercepts Iconify CDN API requests.
- `fallbacks.document` injects `handlerDidError`, which returns `Response.error()` for generic fetch/XHR requests and produces the observed browser error.
- `connect-src` already permits `api.iconify.design`, `api.unisvg.com`, and `api.simplesvg.com`; CSP is not the blocker.
- Secondary regressions exist in the same config surface: `importScripts` is ignored and the push handler is not imported into the generated service worker.

## Target Release and Versioning

- Roadmap `Current Version` still reports `v0.8.2`, while the repository currently reports `0.8.3` in `package.json`.
- `Current Working Release` is explicitly `none — ready for next cycle`, so this plan targets the next patch release after the repository version: `v0.8.4`.
- DevOps/Roadmap should confirm release bookkeeping during release preparation so roadmap metadata catches up with shipped version artifacts.

## Decision Record

- [RESOLVED] Fix the root cause in PWA configuration rather than replacing Iconify icons one-by-one. Rationale: the defect is a service-worker routing error, and per-icon workarounds would leave the intercept bug active for future icons and other cross-origin fetches.
- [RESOLVED] Keep external Iconify CDN fetches on the network path with explicit `NetworkOnly` routing. Rationale: these API calls are dynamic, small, and should not participate in offline fallback behavior.
- [RESOLVED] Preserve the existing PWA feature set instead of disabling the service worker on provider detail pages. Rationale: the user-facing regression is narrow, and disabling PWA behavior would trade one bug for broader product regressions.
- [RESOLVED] Treat ignored `importScripts` and `buildExcludes` as part of the same fix scope. Rationale: they share the same misconfiguration surface and should be corrected atomically while touching `withPWA` config.
- [RESOLVED] Keep CSP unchanged unless implementation evidence contradicts analysis. Rationale: current directives already allow the required Iconify origins, so CSP changes would add noise without addressing the verified failure path.
- [DEFERRED: implementer + broader cross-origin audit + next reliability patch/release] Audit all external fetches against Workbox default cross-origin behavior after the targeted fix lands. Rationale: the current incident proves the default route can affect other endpoints, but the immediate user value is restoring provider-detail icon rendering.

## Assumptions

- The generated service worker is produced exclusively through `@ducanh2912/next-pwa` configuration in `next.config.js`.
- Provider detail pages rely on `@iconify/react` runtime fetches and do not currently vendor these icon sets locally.
- A focused patch release is the right vehicle because the defect is user-visible, reproducible, and isolated to runtime configuration rather than a larger feature change.

## Scope

**In scope**

- Correct `withPWA` configuration shape for `@ducanh2912/next-pwa@10.x`.
- Ensure Iconify CDN requests bypass Workbox caching/error fallback behavior.
- Restore push-handler import wiring while updating the same Workbox config surface.
- Verify generated service-worker behavior and provider detail icon rendering under PWA conditions.
- Update release/version artifacts for `v0.8.4`.

**Out of scope**

- Replacing `@iconify/react` with bundled/local SVG icons across the app.
- Broader redesign of provider detail actions or visual styling.
- Broad re-architecture of all PWA caching rules beyond the minimum fix needed to remove this failure mode.
- Exhaustive audit/remediation of all cross-origin app integrations outside the documented deferred follow-up.

## Plan

1. **Correct the Workbox option boundary in `next.config.js`**
   - Move Workbox-specific options into the `workboxOptions` object expected by `@ducanh2912/next-pwa@10.x`.
   - Ensure existing intent is preserved for `runtimeCaching`, `importScripts`, `skipWaiting`, and exclusion rules.
   - Acceptance criteria:
     - The `withPWA` configuration is aligned with the installed library API.
     - No top-level Workbox options remain that the plugin silently ignores.
     - The resulting config remains minimal and readable.

2. **Add explicit Iconify CDN bypass routing**
   - Introduce a dedicated runtime-caching rule that matches `api.iconify.design`, `api.unisvg.com`, and `api.simplesvg.com` and handles them with `NetworkOnly`.
   - Place the rule so it takes precedence over broader asset/data routes.
   - Acceptance criteria:
     - Iconify CDN requests are never cached or satisfied through Workbox fallback logic.
     - The rule covers the known fallback origins used by `@iconify/react` in this repo.
     - The change does not broaden cross-origin interception.

3. **Restore secondary service-worker wiring in the same config surface**
   - Ensure the push handler import is preserved through the correct `workboxOptions` path.
   - Translate `buildExcludes` intent into the appropriate Workbox exclusion field used by the installed plugin.
   - Acceptance criteria:
     - Generated service-worker output includes the push handler import.
     - Targeted manifest/build files are not accidentally precached because of misplaced config.
     - No unrelated PWA behavior is disabled to achieve the fix.

4. **Verify build-time and runtime behavior**
   - Confirm the generated service worker reflects the expected route/import changes.
   - Validate provider detail pages in a PWA-enabled environment, including `/providers/[id]` pages that render `lucide:share-2`, `mdi:instagram`, `mdi:internet`, and `entypo:old-phone`.
   - Confirm failure mode is removed both for first load and after service-worker registration/cache state changes.
   - Acceptance criteria:
     - Provider detail icons render correctly with the service worker active.
     - Browser console no longer reports `Error Response to FetchEvent.respondWith()` for Iconify CDN requests.
     - Generated service-worker artifacts match intended config changes.

5. **Add targeted regression coverage**
   - Add or update automated coverage around the PWA config boundary and/or icon rendering path at the highest-value layer available in the current repo setup.
   - Keep coverage focused on preventing reintroduction of mis-scoped Workbox options and broken provider-detail icon rendering.
   - Acceptance criteria:
     - The test strategy covers the root-cause area, not just the visible symptom.
     - Coverage is maintainable and does not depend on brittle external-network assumptions where avoidable.

6. **Update version and release artifacts**
   - Bump version artifacts to `v0.8.4`.
   - Add a `CHANGELOG.md` entry summarizing the Iconify/PWA fix and the secondary service-worker config correction.
   - Acceptance criteria:
     - Version artifacts consistently reflect `v0.8.4`.
     - Release notes describe the user-visible defect and the scope of the PWA fix.

## Validation

- Static analysis: run lint/type-check for touched configuration and related code paths.
- Build validation: run a production build that generates the service worker.
- Runtime validation: verify provider detail pages with the service worker active, not just in non-PWA local development.
- Artifact validation: inspect generated service-worker output to confirm the Iconify bypass route and push-handler import are present.
- Regression validation: ensure existing provider detail actions and non-Iconify page rendering still function.

## Testing Strategy

- Unit or configuration-level coverage for the `next.config.js` PWA wiring where practical.
- Integration or browser-level validation for provider detail rendering with service-worker registration enabled.
- Manual validation in a production-like or UAT environment for the exact reported provider detail scenario.
- Focus on contact/share action visibility and absence of SW/CORS console failures.

## Risks and Mitigations

- **Risk**: Mis-ordering runtime-caching rules still allows broader routes to catch Iconify requests.
  - **Mitigation**: Treat rule precedence as part of acceptance and verify using generated service-worker output.

- **Risk**: Correcting the config boundary changes unrelated PWA behavior because previously ignored settings suddenly become active.
  - **Mitigation**: Validate generated SW output, offline fallback behavior, and push-handler inclusion in the same implementation pass.

- **Risk**: Local development may mask the bug because PWA behavior is often disabled outside production-like builds.
  - **Mitigation**: Require build-time artifact inspection and runtime validation with PWA enabled.

- **Risk**: Roadmap version metadata lags the repository version.
  - **Mitigation**: Keep `v0.8.4` as the implementation target and require release-bookkeeping confirmation during DevOps.

## Rollback Considerations

- If the targeted Workbox changes introduce broader PWA regressions, revert to the prior PWA config and ship a narrow hotfix that disables only the new routing adjustments while preserving release integrity.
- Preserve a diff of generated service-worker output before/after the fix so rollback can be based on artifact behavior rather than source assumptions.

## Handoff Notes

- Implementer should start from Analysis 046 and preserve its verified root-cause framing.
- This is a root-cause configuration fix, not a UI-component rewrite.
- If implementation evidence contradicts the analysis and suggests CSP or library behavior differs in built output, stop and escalate before widening scope.

## Duration Estimates

- Analysis: 1.0–1.5h completed
- Planning: 0.5–0.75h completed
- Implementation: 1.5–3.0h
- QA: 0.75–1.5h
- UAT: 0.5–1.0h
- DevOps: 0.25–0.5h

Key uncertainty drivers: generated service-worker inspection after build, how best to encode regression coverage in the current test stack, and whether any secondary PWA behaviors surface once the ignored options become active.