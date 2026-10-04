---
ID: 090
Origin: 090
UUID: a3f7b2e1
Status: Released
---

# Implementation 090 — Home & Navigation Redesign: Merged Discovery Surface

| Field             | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Plan              | `agent-output/planning/090-home-nav-redesign-plan.md`          |
| Implementer       | GitHub Copilot                                                  |
| Date              | 2026-04-15T10:23Z                                               |
| Branch            | `session/090-home-nav-redesign`                                 |
| GitHub Issue      | #144                                                            |
| Version (prelim.) | 0.10.19 (preliminary — confirmed at DevOps Stage 1)             |

---

## Changelog

| Date (UTC)       | From       | Request/Summary                                                   |
| ---------------- | ---------- | ----------------------------------------------------------------- |
| 2026-04-15T10:23 | Implementer | Initial implementation of Plan 090 milestones M1–M6              |

---

## Implementation Summary

Replaced the Stage 3 mobile home screen (≥15 providers) with a merged Home+Search discovery surface. The screen now shows:

1. A glassmorphism fixed header containing a tap-to-navigate `HomeSearchBar` and a `SectionSelector` (Food / Ummah / Stores tab bar)
2. A scrollable body with `CategoryGallerySection` filtered to the active section
3. Clicking a category navigates to `/providers?category=X&section=Y` — preserving section context

The `MobileGreetingHeader` has been removed from Stage 3. The "Business" label is globally renamed to "Stores" via i18n. The bottom nav bar (`MobileFooterBar`) is unchanged.

---

## Value Statement Validation

**Original**: "Redesign the UFlow home screen — merge Home + Search into a single page with: (1) Search bar at top, (2) Tab bar: Food | Ummah | Stores, (3) Category galleries that respond to the active tab, (4) Bottom nav bar unchanged."

**Delivered**:
- ✅ Search bar (`HomeSearchBar`) at top of Stage 3 header — navigates to `/providers?section=` on tap/Enter
- ✅ Tab bar with Food / Ummah / Stores (i18n) controlling active section state
- ✅ `CategoryGallerySection` filters to active section via `fetchCategoriesBySection(section)`
- ✅ `MobileFooterBar` unchanged (Home→`/`, Explore→`/providers`)

---

## Milestones Completed

- [x] M1: i18n key additions (all 6 translation files) + SectionSelector i18n migration
- [x] M2: HomeSearchBar component (TDD, 9/9 tests)
- [x] M3: `fetchCategoriesBySection` service + CategoryGallerySection `section` prop
- [x] M4: Stage 3 block in RootPageContent — HomeSearchBar + SectionSelector + filtered gallery
- [x] M5: Navigation verification — MobileFooterBar routes confirmed (no code changes needed)
- [x] M6: Version bump 0.10.18 → 0.10.19, CHANGELOG entry, lockfile aligned

---

## Files Modified

| File | Changes | Lines touched |
| ---- | ------- | ------------- |
| `src/translations/de.ts` | Added `home.*`, `sections.*` keys before `search:` block | +12 |
| `src/translations/en.ts` | Added `home.*`, `sections.*` keys | +12 |
| `src/translations/ar.ts` | Added `home.*`, `sections.*` keys (Arabic) | +12 |
| `src/translations/tr.ts` | Added `home.*`, `sections.*` keys (Turkish) | +12 |
| `src/translations/ur.ts` | Added `home.*`, `sections.*` keys (Urdu) | +12 |
| `src/translations/ps.ts` | Added `home.*`, `sections.*` keys (Pashto) | +12 |
| `src/features/search/components/SectionSelector.tsx` | Added `useLanguage()` hook, `getSectionLabel()`, `SECTION_ICONS` + `SECTION_ORDER`, renamed Business→Stores via i18n | ~30 |
| `src/services/categories.ts` | Added `fetchCategoriesBySection(section)` function | +45 |
| `src/components/shared/CategoryGallerySection.tsx` | Added optional `section` prop, switched query key/fn, preserve section in nav URL | +15 |
| `src/components/shared/RootPageContent.tsx` | Replaced Stage 3 block; removed MobileGreetingHeader; added HomeSearchBar + SectionSelector imports and activeSection state | ~50 |
| `src/__tests__/components/SectionSelector.test.tsx` | Added LanguageProvider mock; updated Business→Stores label in assertions | +20 |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | Added missing `beforeEach` import | +1 |
| `package.json` | Version bump 0.10.18 → 0.10.19 | 1 |
| `package-lock.json` | Aligned to 0.10.19 via `npm install --package-lock-only` | automated |
| `CHANGELOG.md` | Added `[0.10.19]` entry | +20 |

---

## Files Created

| File | Purpose |
| ---- | ------- |
| `src/features/search/components/HomeSearchBar.tsx` | Tap-to-navigate home search affordance (Plan 090 M2) |
| `src/__tests__/features/search/HomeSearchBar.test.tsx` | TDD test — 9 tests, all pass |
| `src/__tests__/services/fetchCategoriesBySection.test.ts` | TDD test — 5 tests, all pass |
| `agent-output/implementation/090-home-nav-redesign.md` | This document |

---

## Code Quality Validation

- [x] `npm run lint` — 0 errors, 31 pre-existing warnings (none in Plan 090 files)
- [x] `npm run type-check` — exits 0 (clean)
- [x] `node_modules/.bin/vitest run` — 1002 passed, 18 skipped, 0 failed
- [x] `npm install --package-lock-only` — lockfile aligned to 0.10.19

---

## TDD Compliance

| Function/Class              | Test File                                              | Test Written First? | Failure Verified? | Failure Reason                                                      | Pass After Impl? |
| --------------------------- | ------------------------------------------------------ | ------------------- | ----------------- | ------------------------------------------------------------------- | ---------------- |
| `HomeSearchBar`             | `src/__tests__/features/search/HomeSearchBar.test.tsx` | ✅ Yes              | ✅ Yes            | `Failed to resolve import "@/features/search/components/HomeSearchBar"` | ✅ Yes        |
| `fetchCategoriesBySection`  | `src/__tests__/services/fetchCategoriesBySection.test.ts` | ✅ Yes           | ✅ Yes            | `fetchCategoriesBySection is not a function`                        | ✅ Yes           |
| `CategoryGallerySection` (section prop) | (regression — existing component modified) | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Pre-fix: `section` prop ignored; no category filtering | ✅ Yes (covered by fetchCategoriesBySection tests) |

---

## Test Coverage

### Unit Tests

| Test suite | Count | Result |
| ---------- | ----- | ------ |
| `HomeSearchBar.test.tsx` | 9 | ✅ Pass |
| `fetchCategoriesBySection.test.ts` | 5 | ✅ Pass |
| `SectionSelector.test.tsx` (089 regression) | 4 | ✅ Pass (fixture updated for Stores rename) |

### Regression

- All 1002 previously-passing tests continue to pass
- `SectionSelector.test.tsx` updated with `LanguageProvider` mock and `Stores` label (expected change from M1)

---

## Test Execution Results

```
node_modules/.bin/vitest run
  Test Files  107 passed | 1 skipped (108)
       Tests  1002 passed | 18 skipped (1020)
    Duration  16.27s
```

---

## Search/Filter Client-Interaction Trace

- **URL lifecycle**: `CategoryGallerySection.handleCategoryClick` builds `new URLSearchParams({ category: categoryId })` and sets `section` when prop is present — ✅ section preserved in category→providers navigation
- **Inline action guard**: No approval/reject actions in `CategoryGallerySection` — N/A

---

## Local Verification Gate

- `Local verification: ⚠️ Blocked` — No `.env.local` with active Supabase credentials in this worktree session. UI changes (Stage 3 layout, HomeSearchBar, SectionSelector) require browser verification by QA/UAT against UAT or prod-like environment.

---

## Deployment Path Audit

N/A — no changes to Dockerfile, GitHub Actions workflows, nginx config, volume mounts, or environment variables.

---

## Assumptions

| Description | Rationale | Risk | Validation |
| ----------- | --------- | ---- | ---------- |
| Header offset `136px` sufficient for safe-area + HomeSearchBar + SectionSelector height | Measured against typical iPhone safe-area (47px) + 24px pad + ~44px bar + ~3px gap + ~40px tabs + ~12px bottom pad | Low–Medium | QA/UAT browser check on iPhone with notch |
| `fetchCategoriesBySection` returns categories with correct deduplication | Tested with 5 unit tests; Supabase RLS allows read on `providers`, `community_services`, `categories` | Low | Confirmed pattern matches existing `fetchUsedCategories` query structure |

---

## Outstanding Items

- Local browser verification deferred to QA/UAT (no Supabase creds in worktree)
- Header offset (136px) for fixed header should be validated on notched iPhones and iPhone SE in UAT
- Version 0.10.19 is preliminary — confirmed at DevOps Stage 1 via `git fetch --tags`

---

## Next Steps

QA → UAT → DevOps
