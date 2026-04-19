---
ID: 091
Origin: 091
UUID: b4e8c3f2
Status: Released
---

# Code Review: 091 — Home Redesign Increment 2

**Plan Reference**: [agent-output/planning/091-home-redesign-increment-2-plan.md](agent-output/planning/091-home-redesign-increment-2-plan.md)
**Implementation Reference**: [agent-output/implementation/091-home-redesign-increment-2-implementation.md](agent-output/implementation/091-home-redesign-increment-2-implementation.md)
**Architecture Reference**: [agent-output/architecture/system-architecture.md](agent-output/architecture/system-architecture.md)
**Date**: 2026-04-17
**Reviewer**: GitHub Copilot (Code Reviewer mode)

---

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-04-17 | Implementer → Code Reviewer | Review before QA | 1 HIGH finding, 1 MEDIUM finding. Verdict: REJECTED pending fixes. |
| 2026-04-17 | Implementer → Code Reviewer | Re-review after fixes | Verified both findings resolved (fallback logic + regression coverage). Verdict: APPROVED. |
| 2026-04-17 | Session → Code Reviewer | Review session hotfixes (icon + stage2 home + navbar) | 1 MEDIUM finding (missing regression test) resolved via fix-in-review. Verdict: APPROVED. |
| 2026-04-17 | User → Code Reviewer | Review recent post-approval changes | 2 HIGH findings + 1 MEDIUM finding. Verdict: REJECTED pending fixes. |
| 2026-04-17 | Implementer → Code Reviewer | Cycle 5 re-review after route-migration fixes | Verified all Cycle 4 blockers resolved (tests aligned + redirect contract tests + fallback asset restored). Verdict: APPROVED_WITH_COMMENTS. |

---

## Architecture Alignment

**Alignment Status**: ALIGNED

What aligns:
- Route placement is correct for App Router public surface: [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx).
- `useSearchParams()` usage is wrapped by a Suspense boundary: [src/app/(public)/suchen/page.tsx#L138](src/app/(public)/suchen/page.tsx#L138).
- Home search routing changed to `/suchen?section=` as planned: [src/features/search/components/HomeSearchBar.tsx#L34](src/features/search/components/HomeSearchBar.tsx#L34).

Re-review result:
- The required direct-URL back-navigation fallback is now explicitly implemented via history check + `router.push('/')` fallback in [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx#L60).

---

## Mandatory Checklist Coverage

### 6e Outbound Data-Flow Cross-Trace
- Outbound param source confirmed: Home search emits `?section=` in [src/features/search/components/HomeSearchBar.tsx#L34](src/features/search/components/HomeSearchBar.tsx#L34).
- Receiver confirmed: `/suchen` reads `section` in [src/app/(public)/suchen/page.tsx#L27](src/app/(public)/suchen/page.tsx#L27).
- Result: param is consumed for tab initialization, and page-level navigation fallback behavior is now guarded.

### 6b/6c/6d/6f/6g/6h
- Not triggered by this change set (no path refactor, agent-spec path edits, deployment path edits, mixed-entity inline actions, or deleted-module replacement work in Plan 091 scope).

---

## TDD Compliance Check

- TDD table present in implementation doc: Yes.
- Tests were added for `/suchen` page and updated for HomeSearchBar URL behavior.
- Re-review verification: explicit regression coverage for empty-history fallback exists in [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx#L92).

---

## Findings

No open findings.

Re-review verification notes:
- Previous HIGH finding resolved in [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx#L60): fallback now uses `window.history.length > 1 ? router.back() : router.push('/')`.
- Previous MEDIUM finding resolved in [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx#L92): explicit direct-URL/empty-history regression test now asserts `router.push('/')`.
- Additional coverage exists for history-present path in [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx#L78).

---

## Positive Observations

- Section tab visual restyle is clean and uses semantic token direction (`bg-background` / `bg-primary`), matching plan intent.
- HomeSearchBar URL migration to `/suchen` is correctly implemented and covered by updated tests.
- i18n keys for the new page were added across all required translation files.

---

## Verdict

**Status**: APPROVED

**Rationale**: Both prior blockers are resolved in implementation and covered by focused regression tests. The approved plan acceptance criteria are now satisfied for back navigation behavior in both history-present and direct-URL scenarios.

---

## Required Actions

None before QA.

---

## Next Steps

Handing off to qa agent for test execution.

---

# Review Cycle 3 — Session Hotfixes (2026-04-17)

**Scope**: Ad-hoc changes made during live debugging after Plan 091 was approved. No separate plan document.

**Files reviewed**:

| File | Change |
|------|--------|
| [src/features/search/components/SectionSelector.tsx](src/features/search/components/SectionSelector.tsx) | Replace emoji icons with Lucide (`UtensilsCrossed`, `Users`, `Store`) |
| [src/components/shared/RootPageContent.tsx](src/components/shared/RootPageContent.tsx) | stage2 now renders discovery home (search + tabs + galleries); `Stage2Content` removed; `isAppLaunched` early bypass added |
| [src/components/layout/RootClientLayout.tsx](src/components/layout/RootClientLayout.tsx) | Add `isDiscoveryHome` override to force `mobileUiMode='footer'` for stage2/stage3 at `/`; add `forceMobileFooter` feature flag state |
| [src/config/feature-flags.ts](src/config/feature-flags.ts) | Add `forceMobileFooter: boolean` debug flag |

---

## Architecture Alignment (Cycle 3)

**Alignment Status**: ALIGNED

- Discovery home at `/` for stage2 mirrors the stage3 pattern — correct consistency.
- `isDiscoveryHome` bypass is placed at layout level (highest appropriate layer) rather than inside `navigationUtils`, avoiding side effects on other callers.
- `forceMobileFooter` follows the existing debug-flag pattern in `FeatureFlags`.
- `Stage2Content` removal is a clean simplification — the unified discovery home supersedes the old "Stuttgart is being built" screen.

---

## Mandatory Checklist Coverage (Cycle 3)

### 6f Interaction-Layer Audit

Triggered — changes touch `mobileUiMode` which controls `pointer-events` via `data-mobile-ui` attribute.

- `isDiscoveryHome = true` → `mobileUiMode = 'footer'` → `.mobile-footer-bar-wrapper` becomes visible, `.city-navbar-wrapper` is hidden.
- No blocking ancestor left unreviewed: the `mobile-bottom-ui-slot` container is always in the DOM and the CSS visibility is toggled by `data-mobile-ui`. No higher container intercepts events.
- Result: PASS

### 6f — `forceMobileFooter` interaction

- `forceMobileFooter` takes the highest priority in the `mobileUiMode` chain (above `isDiscoveryHome`). This is intentional for debug/QA override.
- The flag defaults to `false` and is only activated via `NEXT_PUBLIC_FEATURE_FORCEMOBILEFOOTER=true`. No production risk.

### 6h Deleted-Module Residue Sweep

Triggered — `Stage2Content` import was removed from `RootPageContent.tsx`.

- Searched for remaining imports and references to `Stage2Content`.
- Result: `Stage2Content` component **was NOT deleted** — it is still used by [src/app/(public)/city/[cityName]/page.tsx#L104](src/app/(public)/city/[cityName]/page.tsx#L104) for the deep-link city page. Component file at `src/components/shared/Stage2Content.tsx` remains intact.
- The `RootPageContent.tsx` change is a clean import removal, not a module deletion. No residue sweep needed.
- Result: PASS ✅

---

## TDD Compliance (Cycle 3)

These changes were session hotfixes, not a formal TDD-first plan. Tests were run after changes.

| Area | Test Status |
|------|-------------|
| `SectionSelector.tsx` icon change | Existing tests pass (4/4) — tests are behavior-based (click/aria), not icon-specific |
| `RootPageContent.tsx` stage2 merge | No test file for `RootPageContent` (pre-existing gap) |
| `RootClientLayout.tsx` `isDiscoveryHome` | **Fix-in-review applied** — see Findings below |
| `feature-flags.ts` `forceMobileFooter` | No test needed — default is `false`; env-var override only |

---

## Findings (Cycle 3)

### Critical
None.

### High
None.

### Medium

**[MEDIUM — Fix-in-Review Applied] Missing regression test for `isDiscoveryHome` logic**
- **Location**: [src/components/layout/RootClientLayout.tsx](src/components/layout/RootClientLayout.tsx) — `isDiscoveryHome` expression and `mobileUiMode` priority chain
- **Issue**: The `isDiscoveryHome` fix was the exact bug-fix path (stage2 unauthenticated at `/` would show `CityEarlyAccessNavbar` instead of `MobileFooterBar`). No targeted test existed to detect a regression. `useAppStage` was also not mocked in the test file, so stage-based logic could never be exercised.
- **Fix applied**: Added `vi.mock('@/hooks/useAppStage', ...)` + a new describe block in [src/__tests__/components/RootClientLayout.test.tsx](src/__tests__/components/RootClientLayout.test.tsx) with 5 focused logic tests:
  - `[post-fix PASSES] stage2 at / → isDiscoveryHome is true`
  - `[post-fix PASSES] stage3 at / → isDiscoveryHome is true`
  - `[post-fix PASSES] isDiscoveryHome overrides showMobileFooter=false for stage2 unauthenticated user`
  - `[pre-fix behavior documented] without isDiscoveryHome, stage2+/ unauthenticated would show "navbar" not "footer"`
  - `[post-fix PASSES] stage-loading at / → isDiscoveryHome false (no premature footer)`

### Low

**[LOW] Redundant `aria-label` on tab buttons in `SectionSelector.tsx`**
- **Location**: [src/features/search/components/SectionSelector.tsx](src/features/search/components/SectionSelector.tsx) — `<button aria-label={label}>...<span>{label}</span></button>`
- **Issue**: `aria-label` overrides the accessible name from visible text. Since both the `aria-label` and the `<span>` carry the same text, this is redundant (but harmless — screen readers announce the correct label once).
- **Recommendation**: Remove `aria-label={label}` from the button — the visible `<span>{label}</span>` provides the accessible name via normal text content. This cleans up the markup without behavior change.
- **Action**: Note for follow-up — not blocking.

### Info

**[INFO] `getSectionLabel` if/else chain in `SectionSelector.tsx`**
- A minor KISS candidate: the three-branch `if/else` could be a lookup object (matching `SECTION_ICONS` pattern). Acceptable at 3 entries; no action required.

---

## Positive Observations (Cycle 3)

- `SECTION_ICONS` typed as `Record<Section, LucideIcon>` ensures type safety at compile time — if a Section variant is added, TypeScript will enforce the icon mapping.
- Comment `// Keep Ummah icon distinct from the mobile navbar Home icon` explains the design intent clearly.
- `isDiscoveryHome` is placed at the correct priority level in `mobileUiMode` — after `forceMobileFooter` (debug override) but before `showMobileFooter` (stage logic), preventing it from being circumvented by accidental flag combinations.
- `forceMobileFooter` defaults to `false` and has no production surface; its debug intent is clear.
- The `isAppLaunched` early-return in `RootPageContent.tsx` is cleanly placed at the top of the `useEffect` before any localStorage reads — lowest-cost path for the launched state.
- Header glassmorphism style uses `isolation: isolate` — correct stacking context management.

---

## Verdict (Cycle 3)

**Status**: APPROVED

**Rationale**: No blocking findings. The MEDIUM regression-test gap was resolved via fix-in-review (5 focused logic tests added). The icon swap and layout changes are clean, well-typed, and architecturally consistent. The `Stage2Content` removal did not create dead-code residue. The `LOW` `aria-label` finding is a cosmetic improvement for a future pass.

---

## Required Actions

None before QA.

---

## Next Steps (Cycle 3)

Handing off to qa agent for test execution.

---

# Review Cycle 4 — Recent Post-Approval Changes (2026-04-17)

**Scope**: Latest working-tree changes after Cycle 3 approval, focused on route migration from `/suchen` to `/search`, new `/search` page, and related test/deployment artifacts.

**Files reviewed**:

| File | Change |
|------|--------|
| [src/app/(public)/search/page.tsx](src/app/(public)/search/page.tsx) | New canonical search page shell using semantic tokens and shared components |
| [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx) | Legacy route changed from page shell to redirect (`router.replace('/search...')`) |
| [src/features/search/components/HomeSearchBar.tsx](src/features/search/components/HomeSearchBar.tsx) | Navigation target changed to `/search?section=` |
| [src/__tests__/features/search/HomeSearchBar.test.tsx](src/__tests__/features/search/HomeSearchBar.test.tsx) | Still asserts `/suchen?section=` |
| [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx) | Still tests old full-page UI rather than redirect behavior |
| [public/fallback-ce627215c0e4a9af.js](public/fallback-ce627215c0e4a9af.js) | Deleted tracked production fallback asset |

---

## Architecture Alignment (Cycle 4)

**Alignment Status**: MINOR_DEVIATIONS

What aligns:
- Route transition strategy is directionally sound: `/suchen` remains as compatibility entry and redirects to `/search`.
- New `/search` page reuses existing shared elements (`SectionSelector`, `Button`, `useLanguage`) and semantic Tailwind tokens.

What deviates:
- Test suite and implementation are now out of sync for both `HomeSearchBar` and `/suchen` page behavior.
- A tracked production PWA fallback artifact was deleted, which historically is treated as release-sensitive in this repository.

---

## Mandatory Checklist Coverage (Cycle 4)

### 6b Path Refactor / File-Move Checklist

Triggered (route-path migration in app behavior: `/suchen` → `/search`).

Search terms executed:
- `/suchen\?|/suchen\b` in `scripts/**`
- `/suchen\?|/suchen\b` in `.github/workflows/**`
- `/suchen\?|/suchen\b` in `deploy/**`
- `/suchen\?|/suchen\b` in `docs/**`

Results:
- `scripts/**`: no stale refs found
- `.github/workflows/**`: no stale refs found
- `deploy/**`: no stale refs found
- `docs/**`: one historical reference in [docs/reviews/REVIEW_FIXES_SUMMARY.md](docs/reviews/REVIEW_FIXES_SUMMARY.md#L15)

Assessment:
- No blocking stale operational path references were found in deployment/automation surfaces.

### 6h Deleted-Module Residue Sweep

Triggered (`public/fallback-ce627215c0e4a9af.js` deletion).

Checks performed:
- Searched repo for `fallback-ce627215c0e4a9af.js` references
- Confirmed repeated deployment history expects this file to remain tracked (multiple prior stage docs)

Assessment:
- Deletion is suspicious and historically treated as accidental drift in this repo.
- Classified as HIGH until explicitly justified/replaced.

---

## TDD Compliance (Cycle 4)

- Existing tests were not updated to match the route migration behavior.
- No new redirect-focused tests were added for `/suchen` after converting it to a redirect component.
- No dedicated tests were added for the new canonical `/search` page.

---

## Findings (Cycle 4)

### Critical
None.

### High

**[HIGH] Behavior/Test Mismatch: `HomeSearchBar` route changed but tests still assert old destination**
- **Location**: [src/features/search/components/HomeSearchBar.tsx](src/features/search/components/HomeSearchBar.tsx#L33), [src/__tests__/features/search/HomeSearchBar.test.tsx](src/__tests__/features/search/HomeSearchBar.test.tsx#L53)
- **Issue**: Production code now navigates to `/search?section=...`, while tests still require `/suchen?section=...`.
- **Why it matters**: This invalidates regression coverage for a key entry-point flow and causes test failures/false confidence depending on execution path.
- **Recommendation**: Update test assertions to `/search?section=...` and rename test descriptions/comments accordingly.

**[HIGH] Obsolete Test Suite: `/suchen` tests still validate removed UI instead of redirect contract**
- **Location**: [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx#L10), [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx#L47)
- **Issue**: `/suchen` now returns `null` and redirects in `useEffect`, but tests still assert header/accordion rendering from the previous implementation.
- **Why it matters**: Core behavior changed from render-page to redirect-route; current tests no longer test reality and will fail or be disabled, leaving redirect behavior unguarded.
- **Recommendation**: Replace obsolete tests with redirect contract tests:
  - with `section=food`, assert `router.replace('/search?section=food')`
  - without section, assert `router.replace('/search')`
  - ensure no legacy UI assertions remain in `/suchen` test file

### Medium

**[MEDIUM — Fix Before QA] Release Asset Regression Risk: tracked production fallback file deleted**
- **Location**: [public/fallback-ce627215c0e4a9af.js](public/fallback-ce627215c0e4a9af.js)
- **Issue**: The file is deleted in the recent delta. Repository deployment history repeatedly documents this file as a required tracked production fallback artifact.
- **Why it matters**: This can break service-worker fallback behavior or fail release gate checks that expect tracked fallback assets.
- **Recommendation**: Restore the file (or regenerate and commit the correct production fallback artifact set) before QA handoff.
- **Disposition required**: **Fix before QA** (constraint-sensitive; release invariant).

### Low / Info

**[LOW] Documentation/comments drift in `HomeSearchBar` after route migration**
- **Location**: [src/features/search/components/HomeSearchBar.tsx](src/features/search/components/HomeSearchBar.tsx#L8)
- **Issue**: JSDoc still says `/suchen` while implementation uses `/search`.
- **Recommendation**: Update comments to reflect canonical route and mention `/suchen` only as legacy redirect.

---

## Verdict (Cycle 4)

**Status**: REJECTED

**Rationale**: Two HIGH findings affect correctness of regression coverage for the new route contract, and one MEDIUM release-sensitive artifact issue must be explicitly resolved before QA.

---

## Required Actions (Cycle 4)

1. Update `HomeSearchBar` tests to `/search` target and align descriptions/comments.
2. Replace obsolete `/suchen` UI tests with redirect behavior tests.
3. Restore or regenerate tracked production fallback asset (`public/fallback-ce627215c0e4a9af.js`) and verify service-worker fallback asset set is intact.

---

## Next Steps (Cycle 4)

Return to Implementer for fixes, then resubmit for Code Reviewer re-review.

---

# Review Cycle 5 — Re-Review After Route-Migration Fixes (2026-04-17)

**Scope**: Verify the Implementer's fixes for all Cycle 4 blocking findings (2 HIGH + 1 MEDIUM) plus 1 LOW cleanup item.

**Files reviewed**:

| File | Change |
|------|--------|
| [src/__tests__/features/search/HomeSearchBar.test.tsx](src/__tests__/features/search/HomeSearchBar.test.tsx) | Updated route assertions from `/suchen` to `/search` |
| [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx) | Replaced obsolete UI-shell tests with redirect contract tests |
| [src/features/search/components/HomeSearchBar.tsx](src/features/search/components/HomeSearchBar.tsx) | Updated JSDoc/comments to reflect `/search` canonical route |
| [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx) | Verified redirect implementation contract under test |
| [public/fallback-ce627215c0e4a9af.js](public/fallback-ce627215c0e4a9af.js) | Verified production fallback asset restored |

---

## Architecture Alignment (Cycle 5)

**Alignment Status**: ALIGNED

What aligns:
- Canonical search route is implemented at `/search`, while `/suchen` remains a compatibility entrypoint redirecting to `/search`.
- Outbound parameter flow is consistent: Home search emits `?section=` to `/search`, and legacy `/suchen` preserves `?section=` during redirect.
- `/suchen` remains client-safe with `useSearchParams()` wrapped in Suspense.

---

## Mandatory Checklist Coverage (Cycle 5)

### 6e Outbound Data-Flow Cross-Trace

Triggered (query-param routing in `router.push` and `router.replace`).

- Outbound param source: [src/features/search/components/HomeSearchBar.tsx](src/features/search/components/HomeSearchBar.tsx#L33) emits `/search?section=${activeSection}`.
- Legacy receiver/forwarder: [src/app/(public)/suchen/page.tsx](src/app/(public)/suchen/page.tsx#L14) reads `section` and forwards to `/search?section=...`.
- Verification tests: [src/__tests__/features/search/HomeSearchBar.test.tsx](src/__tests__/features/search/HomeSearchBar.test.tsx#L53) and [src/__tests__/app/(public)/suchen/page.test.tsx](src/__tests__/app/(public)/suchen/page.test.tsx#L31).

Result: PASS — outbound params are consumed/forwarded correctly.

### 6h Deleted-Module Residue Sweep

Triggered (Cycle 4 previously deleted a tracked fallback asset).

- Verified restored tracked file exists in [public/fallback-ce627215c0e4a9af.js](public/fallback-ce627215c0e4a9af.js).
- No remaining deletion risk observed for that artifact in current working tree.

Result: PASS — release-sensitive asset regression resolved.

### 6b / 6c / 6d / 6f / 6g

Not triggered by this fix set (no file move/path refactor in high-risk operational surfaces, no agent spec path updates, no deployment entrypoint changes, no interaction-layer/pointer-events edits, no mixed-entity inline action changes).

---

## TDD Compliance (Cycle 5)

- Implementation doc includes a TDD compliance table.
- Cycle 5 changes are regression-alignment fixes to existing behavior and tests.
- Redirect contract coverage now directly tests the real `/suchen` runtime contract instead of obsolete UI expectations.

Assessment: Adequate for this fix scope.

---

## Findings (Cycle 5)

### Critical
None.

### High
None.

### Medium
None.

### Low / Info
None.

---

## Positive Observations (Cycle 5)

- Test intent now matches runtime behavior for route migration (`/suchen` legacy -> `/search` canonical).
- `/suchen` test suite was correctly rewritten to contract-level redirect assertions, reducing brittle UI-coupled expectations.
- JSDoc drift was cleaned up in `HomeSearchBar`, improving maintenance clarity.
- Production fallback asset was restored, removing the release invariant risk identified in Cycle 4.

---

## Verdict (Cycle 5)

**Status**: APPROVED_WITH_COMMENTS

**Rationale**: All Cycle 4 blocking findings are resolved and verified in code and tests. The migration contract is now explicitly covered, and the release-sensitive fallback artifact is restored. No remaining blockers for QA.

---

## Required Actions (Cycle 5)

None before QA.

---

## Next Steps (Cycle 5)

Handing off to qa agent for test execution.


