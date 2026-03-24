---
ID: 048
Origin: 048
UUID: 5e9ac41b
Status: Released
---

# Implementation 048 — Provider modal Barakah badge visuals

## Plan Reference

[agent-output/planning/048-provider-modal-barakah-badges.md](../planning/048-provider-modal-barakah-badges.md)

## Date

2026-03-19

## Changelog

| Date       | Handoff       | Request           | Summary                                             |
| ---------- | ------------- | ----------------- | --------------------------------------------------- |
| 2026-03-19 | Planner → Impl | Initial handoff  | Implement Plan 048: modal badge visuals             |

## Implementation Summary

Replaced the legacy string-based Barakah pills in the desktop provider detail modal with structured `BadgeLabel` components rendered from `provider.badges`. The existing data path (`getProviderById` → `useProvider` → `ProviderDetailModal`) already fetches badges in parallel — no new RPC or service layer changes were needed.

**Key changes:**
1. Swapped `provider.barakah_effects.map()` with icon-switch logic → `provider.badges.map()` rendering `<BadgeLabel>` components
2. Removed `Hatem Ipsum` placeholder subtitle
3. Removed 4 unused Lucide icon imports (`Sparkles`, `Moon`, `Building2`, `Tag`)
4. Added `language` destructuring from `useLanguage()` for `BadgeLabel` locale prop
5. Added `providers.noBadges` translation key across all 6 languages (de, en, ar, tr, ur, ps)
6. Replaced hardcoded "Keine Barakah Effekte" empty state with `t('providers.noBadges')`

## Milestones Completed

- [x] M1: Data-path audit — confirmed `provider.badges` populated by existing `getProviderById()`
- [x] M2: Badge hydration — no work needed, data path already complete
- [x] M3: UI rendering replacement — `BadgeLabel` renders from `provider.badges`, TDD cycle complete
- [x] M4: Regression coverage — 37 tests pass (3 new + 34 existing, 2 legacy tests updated)
- [x] M5: Release artifacts — version bumped to `0.8.8`, CHANGELOG entry added, lockfile aligned

## Files Modified

| Path                                              | Changes                                                           | Lines |
| ------------------------------------------------- | ----------------------------------------------------------------- | ----- |
| `src/components/providers/ProviderDetailModal.tsx` | Replace legacy pills → `BadgeLabel`, add import, destructure `language`, remove unused icons, remove Hatem Ipsum, use `t('providers.noBadges')` | ~36 |
| `src/__tests__/components/ProviderDetailModal.test.tsx` | Add 3 new badge tests, update 3 legacy tests, add badge mock data and imports | ~120 |
| `src/translations/de.ts`                          | Add `noBadges: "Keine Barakah Effekte"`                           | +1 |
| `src/translations/en.ts`                          | Add `noBadges: "No Barakah Effects"`                              | +1 |
| `src/translations/ar.ts`                          | Add `noBadges: "لا توجد تأثيرات بركة"`                            | +1 |
| `src/translations/tr.ts`                          | Add `noBadges: "Bereket etkisi yok"`                              | +1 |
| `src/translations/ur.ts`                          | Add `noBadges: "کوئی برکت اثرات نہیں"`                            | +1 |
| `src/translations/ps.ts`                          | Add `noBadges: "د برکت اغیزې نشته"`                               | +1 |
| `package.json`                                    | Version bump `0.8.7` → `0.8.8`                                   | 1 |
| `package-lock.json`                               | Lockfile alignment with `0.8.8`                                   | 4 |
| `CHANGELOG.md`                                    | Add `[0.8.8]` entry for Plan 048                                  | +6 |

## Files Created

None.

## Code Quality Validation

| Gate           | Status | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| `npx vitest run` | ✅ Pass | 302 passed, 18 skipped, 0 failed                           |
| `npm run type-check` | ✅ Pass | `tsc --noEmit` exits 0                                 |
| `npm run build` | ⚠️ Blocked | Pre-existing: `.env.local` not present in worktree (missing `NEXT_PUBLIC_SUPABASE_URL`). Build fails on all branches without env. Type-check confirms no compile errors from this change. |
| Lint           | Not run | No lint changes expected; only template/i18n additions      |

## Value Statement Validation

**Original**: "The provider modal's Barakah Effekte section renders actual provider badge visuals for providers that have structured badge data."

**Implementation delivers**: The modal now renders `BadgeLabel` components from `provider.badges` showing verified badge icons and labels. Providers without badges see a localised empty-state message. The `Hatem Ipsum` placeholder is removed.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| Badge rendering in modal (new behavior) | `ProviderDetailModal.test.tsx` | ✅ Yes | ✅ Yes | "Unable to find an element with role status" — no BadgeLabel rendered yet | ✅ Yes |
| No placeholder text (new behavior) | `ProviderDetailModal.test.tsx` | ✅ Yes | ✅ Yes | Found "Hatem Ipsum" text still present | ✅ Yes |
| Empty state (new behavior) | `ProviderDetailModal.test.tsx` | ✅ Yes | ✅ Yes (passes pre-impl — existing empty state) | N/A — test passed pre-impl | ✅ Yes |
| Legacy test: section heading | `ProviderDetailModal.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Multiple elements matched `/Barakah/i` | ✅ Yes |
| Legacy test: badges available | `ProviderDetailModal.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Old test expected `'Iman'` text from legacy pills | ✅ Yes |
| Legacy test: no badges empty state | `ProviderDetailModal.test.tsx` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | `t('providers.noBadges')` returned key string before adding translation | ✅ Yes |

## Test Coverage

### New Tests (3)

1. **should render structured badge visuals when badges are present** — Renders modal with 2 mock badges (HALAL + MUSLIM_OWNED), asserts 2 `role="status"` elements exist
2. **should not show placeholder text when structured badges exist** — Asserts `Hatem Ipsum` text is absent when badges present
3. **should show empty state when provider has no badges** — Renders with `badges: []`, asserts 0 `role="status"` elements

### Updated Legacy Tests (3)

4. **should render barakah effects section heading** — Updated regex from `/Barakah/i` → `/Our Barakah Effect|Unser Barakah Effekt/i` to avoid matching empty-state text
5. **should render badge labels when badges are available [post-fix]** — Was asserting on legacy `'Iman'` text; now asserts `role="status"` count = 2
6. **should show empty state text when no badges exist [post-fix]** — Was asserting hardcoded German text; now asserts `/Keine Barakah Effekte|No Barakah Effects/`

## Test Execution Results

```
$ npx vitest run
Test Files  34 passed | 1 skipped (35)
     Tests  302 passed | 18 skipped (320)

$ npx vitest run src/__tests__/components/ProviderDetailModal.test.tsx --reporter=verbose
Test Files  1 passed (1)
     Tests  37 passed (37)

$ npm run type-check
> tsc --noEmit
(exit 0)
```

## Outstanding Items

| Item | Type | Description |
| --- | --- | --- |
| `npm run build` blocked | Infrastructure | `.env.local` not present in worktree. Build requires `NEXT_PUBLIC_SUPABASE_URL`. Pre-existing issue not related to Plan 048 changes. |
| UAT visual verification | QA/UAT | Must verify `https://uat.ummahflow.com/providers/be186e0a-ae33-42d6-951c-6cc4c455ba56` shows badge visuals after deployment |
| Taxonomy mismatch (Critique F1) | Advisory | Legacy `barakah_effects` (Iman/Zakat/Sunnah) and structured `badges` (HALAL/MUSLIM_OWNED) are different taxonomies. Providers with only legacy effects and no structured badges will see empty state. Accepted per plan scope — structured badges are canonical. |

## Next Steps

1. **Code Review** → reviewer validates diff quality and TDD compliance
2. **QA** → verifies test coverage, runs full suite, validates translation keys
3. **UAT** → visual confirmation on UAT environment against reference provider URL
