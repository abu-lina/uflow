---
ID: 17
Origin: 17
UUID: b7f2e4c1
Status: Released
---

# Plan 017: Fix EN Header Translation Regressions

## Plan Header

- **Target Release**: v0.6.2
- **Epic Alignment**: Platform foundation (i18n correctness supports trust + discoverability)
- **Status**: Released
- **Related Issues**: None

## Changelog

| Date (UTC) | Author | Change | Notes |
|---|---|---|---|
| 2026-02-23T18:52Z | DevOps | Status: Released | v0.6.2 tagged/pushed, production deployment verified (200 OK) |
| 2026-02-23T18:45Z | DevOps | Status: Committed for Release v0.6.2 | Commit SHA 32bdcf7, 12 files changed, awaiting Stage 2 release approval |
| 2026-02-23T02:00Z | UAT | Status: UAT Approved | All scenarios passed; value statement delivered; APPROVED FOR RELEASE |
| 2026-02-23T01:00Z | Code Reviewer | Status: Code Review Approved | All plan steps complete, APPROVED verdict, ready for QA |
| 2026-02-23T00:00Z | Planner | Drafted plan from Analysis 017 | Targets patch release for user-facing UX regression |

## Release Strategy

Standalone (no other known plans targeting v0.6.2).

## Value Statement and Business Objective

As a **visitor**, I want the UI text to match my selected language (**EN**), so that I can navigate confidently and trust UFlow.

## Objective

Eliminate hardcoded German strings from the header and make the “all locations” state language-agnostic so English users don’t see German defaults and searches don’t mis-handle “Everywhere/Überall” as a literal city.

## Scope

**In scope**:
- Header auth buttons use translations (Login/Register)
- “All locations / Everywhere” uses a canonical, language-agnostic representation in state/URL/service calls
- Backward compatibility: existing URLs/state that contain “Überall” or “Everywhere” still behave as “all locations”

**Out of scope**:
- Reworking SSR/initial language hydration strategy (the LanguageProvider currently starts with `de` to avoid hydration issues)
- Migrating to `next-intl` routing/middleware (project currently uses `LanguageProvider`)

## Current State (from Analysis 017)

- Hardcoded strings in header: [src/components/layout/Header.tsx](src/components/layout/Header.tsx#L208-L214)
- Search context defaults to German “Überall”: [src/providers/search-provider.tsx](src/providers/search-provider.tsx#L19)
- Several services treat “Überall”/translated strings as sentinel values instead of using canonical filter values

## Assumptions

- Preferred language is stored in `localStorage` (`preferred-language`) via `LanguageProvider`
- Search filters are propagated via query params (`q`, `category`, `location`) and should remain shareable

## Open Questions

- **[DEFERRED]**: Should "Online" be treated as a dedicated canonical location filter (separate from city names) across all search surfaces, or is it only a Saved page UX affordance?
  - *Rationale*: Tangential to the reported header translation bug. Current Saved page handling is sufficient. Track as follow-up technical debt if needed.

## Plan

1) Replace hardcoded header strings
- Update [src/components/layout/Header.tsx](src/components/layout/Header.tsx) to replace the hardcoded German labels with translation calls via the existing `t()` function.
- Acceptance:
  - With EN selected, header shows English labels.
  - No occurrences of “Anmelden”/“Registrieren” in the unauthenticated header.

2) Introduce canonical “all locations” representation
- Standardize the “all locations” state to a language-agnostic sentinel (recommended: empty string or `null`) at the state layer.
- Update [src/providers/search-provider.tsx](src/providers/search-provider.tsx) to default to the canonical sentinel (not a translated string).
- Update [src/features/search/components/SearchBar.tsx](src/features/search/components/SearchBar.tsx) to:
  - Display `t('search.everywhere')` when the canonical sentinel is selected.
  - When reading query params, map `location` values of “Überall” and “Everywhere” (and absence) to the canonical sentinel.
  - When writing query params, omit `location` when the canonical sentinel is active (avoids serializing translated values into URLs).
- Acceptance:
  - With EN selected, the location dropdown shows “Everywhere” by default.
  - Searching with a query + “Everywhere” does not accidentally filter on a literal city name “Everywhere/Überall”.

3) Align service-layer filters with the canonical sentinel
- Update filtering logic to treat the canonical sentinel as “no location filter” and stop relying on comparisons to translated strings.
- Likely touchpoints:
  - [src/services/categories.ts](src/services/categories.ts) (remove checks against “Überall”)
  - [src/services/providers.ts](src/services/providers.ts) and [src/services/communityServices.ts](src/services/communityServices.ts) (prefer sentinel/null over `everywhereTranslations` lists)
  - [src/app/(public)/saved/page.tsx](src/app/(public)/saved/page.tsx) (use canonical sentinel rather than “Überall/Everywhere” string comparisons)
- Acceptance:
  - “All locations” behavior remains correct across EN and DE.
  - Deep links containing `location=Überall` or `location=Everywhere` still result in “all locations” behavior.

4) Validation
- Run `npm run type-check`, `npm run lint`, `npm test`.
- Smoke-check locally (EN selected): header auth buttons + location dropdown.

5) Version Management (Release Artifact Updates)
- Bump version from `0.6.1` → `0.6.2` in the version artifacts (e.g., `package.json`) and add a `CHANGELOG.md` entry for the bugfix.
- Acceptance:
  - Version artifacts and changelog reflect v0.6.2 and the i18n header fix.

## Duration Estimates

- Analysis: 0.5–1.0h (complete)
- Planning: 0.5–1.0h
- Implementation: 1.0–3.0h (depends on how widely translated-sentinel comparisons are used)
- QA: 0.5–1.5h
- UAT: 0.25–0.75h
- DevOps: 0.25–0.75h

## Risks & Rollback

- **Risk**: Changing URL param handling could break existing shared links.
  - **Mitigation**: Treat “Überall/Everywhere” as backward-compatible aliases for the canonical sentinel.
- **Rollback**: Revert the canonical sentinel change and restore previous location handling if unforeseen regressions occur.
