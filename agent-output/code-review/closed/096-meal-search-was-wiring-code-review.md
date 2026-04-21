---
ID: 096
Origin: 096
UUID: a3f82c1d
Status: Committed
---

# Code Review — Plan 096: Wire Up Meal Search in "Was?" Accordion

**Plan Reference**: `agent-output/planning/096-meal-search-was-wiring-plan.md`
**Implementation Reference**: `agent-output/implementation/096-meal-search-was-wiring-implementation.md`
**Date**: 2026-04-21T12:30Z
**Reviewer**: Code Reviewer (Code Reviewer mode)
**Session**: S96-meal-search-was

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-04-21T12:30Z | Implementer → Code Reviewer | Review after milestone completion | Full review of all Plan 096 artifacts |

## Memory Mode
Flowbaby retrieval returned 2 relevant memories (Plan 096 critic verdict, implementation record). Proceeding with full artifact context.

---

## Files Reviewed

| File | Type | Verdict |
|------|------|---------|
| `src/services/provider-catalog.ts` | Created | ✅ Clean |
| `src/features/search/components/WasMealResults.tsx` | Created | ✅ Clean (fix-in-review applied) |
| `src/app/(public)/search/page.tsx` | Modified | ✅ Clean |
| `src/translations/de.ts` | Modified | ✅ Clean |
| `src/translations/en.ts` | Modified | ✅ Clean |
| `src/translations/tr.ts` | Modified | ✅ Clean |
| `src/translations/ar.ts` | Modified | ✅ Clean |
| `src/translations/ps.ts` | Modified | ✅ Clean |
| `src/translations/ur.ts` | Modified | ✅ Clean |
| `src/__tests__/services/provider-catalog.test.ts` | Created | ✅ Clean |
| `src/features/search/components/WasMealResults.test.tsx` | Created | ✅ Clean |
| `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | Created | ✅ Clean |
| `package.json` | Modified | ✅ Clean |
| `CHANGELOG.md` | Modified | ✅ Clean |

---

## Path Refactor / File-Move Checklist
No file moves or renames in this plan. N/A.

## Deployment Path Audit
No deployment surface modified. N/A.

## Outbound Data-Flow Cross-Trace Checklist
No new `router.push`, `Link href`, or query params introduced. N/A.

## Interaction-Layer Audit Checklist
No changes to `pointer-events`, `visibility`, overlays, or fixed/sticky containers. N/A.

## Shared Results Actionability Checklist
Results list is read-only (onSelect fills input only, no approve/reject/delete actions). N/A.

## Deleted-Module Residue Sweep
No modules deleted. N/A.

---

## Architecture Alignment

**Alignment Status**: ALIGNED

| Check | Result |
|-------|--------|
| Service in `src/services/` | ✅ `provider-catalog.ts` correctly placed |
| Domain UI in `src/features/search/components/` | ✅ `WasMealResults.tsx` correctly placed |
| RPC/tsvector search — no ILIKE | ✅ `search_provider_items` RPC used exclusively |
| `'use client'` component | ✅ Component correctly decorated |
| Debounce via setTimeout/clearTimeout | ✅ Matches existing `woQuery` pattern |
| i18n via `useLanguage` | ✅ All 6 locales updated |
| Frontend-only D4 constraint | ✅ No DB migration introduced; client-side map built from `providers` query |
| Postgres-first: no premature external services | ✅ |

---

## TDD Compliance Check

**TDD Table Present**: ✅ Yes
**All Rows Complete**: ✅ Yes (2 true TDD, 1 documented as post-fix regression)
**Assessment**: Acceptable. `searchProviderItems` and `WasMealResults` both have module-not-found red-phase evidence. The page integration test is documented as a behavioral regression test (post-fix), which is the correct classification per the [Client-State Precedence Regression Pattern](../../.github/copilot-instructions.md) in AGENTS instructions.

---

## Findings

### Critical
None.

### High
None.

### Medium

**[MEDIUM — Fix-in-Review APPLIED] Asset Path**: Wrong placeholder image path
- **Location**: `src/features/search/components/WasMealResults.tsx:L58`
- **Issue**: Used `/images/placeholders/provider.jpg` (non-existent path, no `placeholders/` subdirectory in `public/images/`). All other provider image fallbacks in the codebase use `/images/placeholder.jpg`. This would produce broken image icons for all result rows where the provider has no image.
- **Fix Applied**: Changed to `/images/placeholder.jpg` to match the established codebase convention (`src/utils/imageUtils.ts` exports `PLACEHOLDER_IMAGE = '/images/placeholder.jpg'`; `ProviderCard.tsx`, `ProviderDetailModal.tsx`, `ProviderCardModal.tsx` all use this same path).
- **Verification**: `public/images/placeholder.jpg` confirmed present in the filesystem. No test update required since existing `WasMealResults.test.tsx` passes `provider_image: null` in the fixture (renders the fallback) and tests do not assert on `src` attribute.

### Low

**[LOW] UX: Premature loading state**
- **Location**: `src/app/(public)/search/page.tsx` — debounce `useEffect`, `setIsLoadingWas(true)` before the `window.setTimeout`
- **Issue**: Loading indicator fires immediately on every keystroke ≥ 2 characters, even while the user is still typing. The RPC does not fire until 300ms after the last keystroke. This causes visual noise (loading state visible while user types).
- **Recommendation**: Move `setIsLoadingWas(true)` inside the `window.setTimeout` callback. Only show loading once the request is actually about to fire. This aligns with the existing city-search pattern where no loading state is set before the timeout.
- **Disposition**: Not blocking for this release. Low user impact at 300ms debounce. Track as follow-up.

**[LOW] Image rendering: `<img>` instead of `next/image`**
- **Location**: `src/features/search/components/WasMealResults.tsx:L69`
- **Issue**: Uses a plain `<img>` tag rather than Next.js `<Image>` component. This bypasses Next.js automatic image optimization (format conversion, lazy loading, responsive sizing).
- **Context**: Provider images can be Supabase storage URLs (external). `<Image>` with external URLs requires explicit `remotePatterns` configuration, which adds complexity. The existing `EmptyCityCard.tsx` and some provider components also use `<img>` for dynamic external URLs. This is a known pattern in the codebase.
- **Recommendation**: If Supabase storage domains are already in `next.config.js` `remotePatterns`, swap to `<Image>`. Otherwise, acceptable as `<img>` for now. Low impact.
- **Disposition**: Not blocking.

### Info

**[INFO] Provider lookup loads all approved providers without LIMIT**
- **Location**: `src/app/(public)/search/page.tsx` — `loadProviderLookup` effect
- **Issue**: `SELECT provider_id, provider_name, provider_images FROM providers WHERE review_status = 'approved'` has no LIMIT clause. At scale this could load a large result set into browser memory.
- **Context**: This is explicitly the D4 decision: frontend-only, client-side map. Acceptable for current DAU. Per project philosophy, scale Postgres vertically / add LIMIT when DAU evidence warrants.
- **Recommendation**: Add `LIMIT 1000` (or use pagination) when provider count approaches this threshold. Note in tech debt or D4 follow-up action.
- **Disposition**: Not blocking. Accepted trade-off per D4.

---

## Positive Observations

- **Clean service contract**: `provider-catalog.ts` correctly separates `ProviderMenuItemRaw` (RPC shape) from `ProviderMenuItem` (client-augmented) per Critic finding F1 resolution. The `/* RPC pre-filters to available items only */` comment directly addresses Critic finding F3.
- **Robust cancellation**: Both the provider lookup effect and the debounce effect use the `isCancelled` flag + `clearTimeout` pattern consistently. No memory leaks.
- **Stable `t` dependency**: `t` is `useCallback`-memoized in `LanguageProvider` on `[language]`. Including it in the search effect deps array is semantically correct (results relabel on language change) and does not cause spurious re-fetches.
- **SRP in `WasMealResults`**: Zero internal data fetching; all data flows in as props. Correct early-return precedence order for the 5 states.
- **Error state accessible**: `role="status"` and `aria-live="polite"` on the error `<p>` — good accessibility for screen readers.
- **Clear all reset is comprehensive**: Explicitly resets `wasResults`, `isLoadingWas`, `isErrorWas` alongside `wasQuery`, preventing stale UI until the effect fires.
- **TDD coverage**: All three test suites passed with 1059 total tests passing (117 files) on the full run.

---

## Security Quick Scan

- No `dangerouslySetInnerHTML`. All user-provided data rendered via JSX (auto-escaped).
- RPC params are typed and forwarded directly — no string concatenation risk.
- Provider image URLs from Supabase (approved-only filter). Rendered as `src=` (not as script or style).
- No secrets or hardcoded credentials introduced.

---

## Verdict

**Status**: APPROVED_WITH_COMMENTS

**Rationale**: The implementation is architecturally sound, follows all established codebase conventions, and satisfies all Plan 096 milestones and Critic findings. One MEDIUM finding (broken placeholder path) has been applied as a fix-in-review and is documented above. Two LOW findings are non-blocking and tracked for follow-up. Full test suite (1059 tests) passes; type-check and lint pass.

## Fix-in-Review Summary

| Finding | File | Change | Test impact |
|---------|------|--------|-------------|
| MEDIUM: Wrong placeholder path | `src/features/search/components/WasMealResults.tsx:L58` | `/images/placeholders/provider.jpg` → `/images/placeholder.jpg` | None; existing tests unaffected |

## Required Actions
None (MEDIUM finding resolved via fix-in-review above).

## Optional Improvements (non-blocking)
1. Move `setIsLoadingWas(true)` inside the `window.setTimeout` callback to eliminate the loading flash during typing.
2. Add `LIMIT` clause to provider lookup query as provider count grows.
3. Evaluate `next/image` adoption if Supabase remote patterns are configured.

---

## Next Steps
Implementation passed review. Handing off to QA agent for test execution.
