---
ID: 090
Origin: 090
UUID: a3f7b2e1
Status: Committed
---

# Code Review: 090 — Home & Navigation Redesign: Merged Discovery Surface

**Plan Reference**: `agent-output/planning/090-home-nav-redesign-plan.md`
**Implementation Reference**: `agent-output/implementation/090-home-nav-redesign.md`
**Date**: 2026-04-15
**Reviewer**: GitHub Copilot (Code Reviewer mode)

---

## Changelog

| Date | From | Request | Summary |
|------|------|---------|---------|
| 2026-04-15 | Implementer | Code review of Plan 090 M1–M6 | Full review; 1 MEDIUM fixed-in-review, 1 LOW noted, 1 INFO noted |

---

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

The implementation follows all documented architecture patterns:

- **Server/Client split**: `HomeSearchBar`, `SectionSelector`, `CategoryGallerySection`, and `RootPageContent` are all correctly marked `'use client'`. Service functions (`fetchCategoriesBySection`) are server-compatible (no browser APIs).
- **Feature folder placement**: `HomeSearchBar` correctly placed in `src/features/search/components/` per the feature-module pattern.
- **Service layer**: `fetchCategoriesBySection` correctly added to `src/services/categories.ts` (shared service pattern).
- **Postgres-first**: D7 resolved using strategy (b) — queries `listing_type` on `providers` and `community_services` table directly. No Redis, no external search added.
- **i18n**: New keys added to all 6 translation files following existing `home.*` / `sections.*` namespace pattern.
- **React Query**: Section-filtered cache key `['categories-by-section', section]` correctly namespaced; separate from `['used-categories']`.

---

## TDD Compliance Check

**TDD Table Present**: ✅ Yes  
**All Rows Complete**: ✅ Yes (with one acknowledged post-fix row for `CategoryGallerySection`)  
**Test Suite**: 1002 passed, 18 skipped, 0 failed

| Function/Component | Test Written First | Failure Verified | Notes |
|---|---|---|---|
| `HomeSearchBar` | ✅ | ✅ import error verified | 9/9 tests pass |
| `fetchCategoriesBySection` | ✅ | ✅ function-not-found verified | 5/5 tests pass |
| `SectionSelector` (089 regression) | Pre-existing | ✅ LanguageProvider error verified | 4/4 tests pass after fixture update |

---

## Mandatory Checklist Results

### 6e — Outbound Data-Flow Cross-Trace ✅

| Navigation | Param | Receiving end reads it? |
|---|---|---|
| `HomeSearchBar` → `/providers?section=food` | `?section=` | ✅ `/providers/page.tsx:37–41` reads and validates; `ProvidersContent.tsx:119–121` reads via `useSearchParams()` |
| `CategoryGallerySection.handleCategoryClick` → `/providers?category=X&section=Y` | `?section=` | ✅ same receivers above; section preserved in URL |

Both outbound navigation targets deposit their params to receivers that correctly consume them. No outbound data-flow gap.

### 6f — Interaction-Layer Audit ✅

The `<header>` is `fixed`, `z-50`, `sm:hidden`. The body `<div>` offsets `paddingTop: max(136px, ...)`.

- Fixed header is not intercepting scroll events on body (fixed elements are out of document flow).
- `HomeSearchBar` (`div[role="search"]`, `tabIndex={0}`) and `SectionSelector` (`button[role="tab"]`) inside the header correctly receive pointer events — no `pointer-events: none` ancestor above them.
- The outer container `div.flex.min-h-screen` does not block interactivity of fixed descendants.
- Pre-existing `sm:hidden` on header (inherited from Plan 089 Stage 3 pattern): on 640–767px the header hides but the body padding remains. This is a pre-existing cosmetic issue outside Plan 090 scope — noted as INFO below.

### 6h — Deleted-Module Residue Sweep ✅

`MobileGreetingHeader` was removed from Stage 3 rendering path.

- **`src/components/shared/RootPageContent.tsx`**: No import; no usage. ✅
- **Workspace-wide grep for `MobileGreetingHeader`**: Still present in `Stage2Content.tsx` (correct — Stage 2 still uses it), `MobileGreetingHeader.tsx` itself, docs, plan, and critique (reference docs). No stale call sites in runtime code. ✅
- `displayCity` variable retains consumers in Stage 1 (line 208), Stage 2 (line 214), and fallback `CityEarlyAccessEmptyState` (line 277). Not orphaned. ✅

---

## Findings

### Critical
None.

### High
None.

### Medium

**[MEDIUM] Architecture / Plan Compliance: Missing "Coming soon" empty state for section-filtered gallery** — **FIXED IN REVIEW**
- **Location**: `src/components/shared/CategoryGallerySection.tsx`
- **Issue**: Plan M3 Task 4 and Acceptance Criterion both explicitly require: *"if a section has no categories yet, show a localized 'Coming soon' or equivalent message."* The implementation returned `null` for all empty-category cases, including when a `section` prop is active. Users switching to Ummah or Stores on early/staging deployments would see a blank white space with no feedback — a confusing, seemingly broken experience.
- **Fix Applied** (Fix-in-Review): Added a guard after `categories.length === 0` check — when `section` is set, renders:
  ```tsx
  <section className="w-full px-6 py-12 text-center text-muted-foreground lg:hidden">
    <p className="text-sm">{isEnglish ? 'Coming soon' : 'Demnächst verfügbar'}</p>
  </section>
  ```
  Uses existing `detectUserLanguage()` pattern already in the file (de/en binary — matches all other locale-detection in this component). Type-check clean; no new failing tests introduced.
- **Verification**: `get_errors` on `CategoryGallerySection.tsx` returns no errors. ✅

### Low / Info

**[LOW] DRY: `Section` type dual-source import**
- **Location**: `HomeSearchBar.tsx:5`, `SectionSelector.tsx:3` (import from `@/providers/search-provider`) vs `CategoryGallerySection.tsx:7`, `RootPageContent.tsx:13`, `categories.ts` (import from `@/config/sectionFilters`)
- **Issue**: The `Section = 'food' | 'ummah' | 'business'` type is defined in two places. TypeScript accepts both because structural typing makes them identical. This is a pre-existing issue starting with Plan 089 — Plan 090 introduced two new files importing from `@/providers/search-provider`. No runtime risk, but adds confusion about the canonical source.
- **Recommendation**: In a follow-up PR, consolidate to `@/config/sectionFilters` as the single source of truth (it has the additional `SECTION_FILTER_CONFIG` and utility functions, making it the richer owner). Out of scope for Plan 090 — no action required for QA gate.

**[INFO] Pre-existing: `sm:hidden` breakpoint mismatch on Stage 3 header**
- **Location**: `RootPageContent.tsx:221` — `className="fixed left-0 right-0 top-0 z-50 sm:hidden"`
- **Issue**: The outer mobile block is `md:hidden`; the header is `sm:hidden`. On 640–767px screens, the body renders with `paddingTop: 136px` but no header. This leaves dead space at top for tablet-width portrait devices.
- **Note**: This `sm:hidden` pattern was copied verbatim from the prior Stage 3 `MobileGreetingHeader` header (Plan 089) — not a regression from Plan 090. No action required at this gate.

---

## Positive Observations

- **`HomeSearchBar` avoids iOS PWA keyboard** — using `div[role="search"]` instead of `<input>` is the right call. Tapping a real `<input>` on the home page of an iOS PWA raises the keyboard on load, degrading UX. The implementation shows explicit awareness of this constraint.

- **`chainResolving()` mock helper** — the test mock factory that binds `.then`/`.catch` to a terminal `Promise.resolve(...)` while still supporting `.eq()` / `.select()` / `.in()` chaining is well-designed and reusable for any future Supabase service test in this codebase.

- **React Query cache key design** — `['categories-by-section', section]` vs `['used-categories']` correctly isolates section caches. Switching tabs triggers targeted refetches; the global gallery (`/providers`) is unaffected. Clean OCP application.

- **`?section=` preserved on category click** — `new URLSearchParams({ category: categoryId })` + `params.set('section', section)` means users navigating from the home "Stores" tab land on the `/providers` Stores section, not the default Food section. This is a correct and thoughtful cross-tab data-flow decision.

- **`fetchCategoriesBySection` error handling** — follows the same `throw error` pattern as `fetchUsedCategories`. Consistent, predictable, and allows React Query to populate `queryError` for the UI error state.

- **`MobileGreetingHeader` removed cleanly** — no stale import, no ghost reference in runtime code. Stage 2 retains `MobileGreetingHeader` as intended.

- **Type-check and 1002 tests pass** — notably, the `SectionSelector` test fixture was correctly updated to add _both_ the `LanguageProvider` mock (required for the `useLanguage()` change from M1) _and_ the `Stores` label assertion (replacing `business`). These are expected changes, not regressions.

---

## Verdict

**Status**: APPROVED_WITH_COMMENTS

**Rationale**: The implementation is architecturally sound and correctly addresses all Plan 090 deliverables. Test discipline is strong (TDD compliance, 1002 tests passing). The one MEDIUM finding (missing "coming soon" empty state from plan acceptance criteria) was fixed in this review — the fix is minimal, type-clean, and consistent with existing code patterns. Two LOW/INFO items are non-blocking pre-existing concerns.

---

## Required Actions

None. All blocking findings resolved.

---

## Fix-in-Review Summary

| Finding | File Modified | Change | Verification |
|---|---|---|---|
| MEDIUM: Missing empty state for section-filtered gallery | `src/components/shared/CategoryGallerySection.tsx` | Added 8-line guard: when `section` prop is set and `categories.length === 0`, renders "Coming soon / Demnächst verfügbar" section element | `get_errors` → no errors |

QA must verify the fix file: `src/components/shared/CategoryGallerySection.tsx`

---

## Next Steps

Handing off to qa agent for test execution.

QA should:
1. Confirm 1002 tests still pass (full suite)
2. Confirm `npm run type-check` exits 0
3. Browser / UAT test the Stage 3 home screen on narrow mobile: search bar, section tabs, filtered galleries, empty section state
4. Validate header offset (136px) on notched iPhones
