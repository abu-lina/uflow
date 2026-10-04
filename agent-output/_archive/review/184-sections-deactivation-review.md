---
ID: 184
Origin: 184
UUID: d4f2a7e1
Status: Active
---

# Code Review: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | Code Reviewer | Reviewed implementation against plan and architect conditions |

## 2. Verdict

**APPROVED WITH MINOR ISSUES**

## 3. Review Summary

Reviewed 16 changed files across config, translations, components, routes, and tests. The config-driven `SECTION_META` approach is well-implemented and follows the existing `SECTION_FILTER_CONFIG` pattern. Architecture Condition 1 (providers/page.tsx guard) is satisfied. Condition 2 (resolveSection duplication) was not addressed but is non-blocking. One artifact file (`.orig`) was accidentally committed. The implementation is functionally correct with adequate test coverage.

## 4. Files Reviewed

| File | Lines Changed | Role |
|---|---|---|
| `src/config/sectionFilters.ts` | +14 | SECTION_META config, SectionMeta interface |
| `src/features/search/components/SectionSelector.tsx` | +16/-5 | Disabled tabs + "Soon" badge, simplified getSectionLabel |
| `src/app/(public)/ummah/page.tsx` | +5 | Route redirect guard |
| `src/app/(public)/stores/page.tsx` | +5 | Route redirect guard |
| `src/app/(public)/providers/page.tsx` | +1 | Section resolution guard (Architect Condition 1) |
| `src/components/layout/Header.tsx` | +2 | handleSectionChange guard |
| `src/app/(public)/search/page.tsx` | +4 | handleSectionChange guard + resolveSection active check |
| `src/translations/en.ts` | +1 | `sections.soon` key |
| `src/translations/de.ts` | +1 | `sections.soon` key |
| `src/translations/ar.ts` | +1 | `sections.soon` key |
| `src/__tests__/components/SectionSelector.test.tsx` | +31 | 4 new tests (disabled, badge, no-op), 1 updated |
| `src/__tests__/components/Header.test.tsx` | +8/-8 | Updated ummah/store click tests to no-op |
| `src/app/(public)/search/page.test.tsx` | +16/-16 | Mock type fix, inactive section resolution tests |
| `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | +17/-17 | Mock type fix, inactive section behavior tests |
| `src/__tests__/app/search-page-storage.test.tsx` | +5 | Added SECTION_META mock |
| `src/__tests__/regression/plan172-location-persistence.test.tsx` | +5 | Added SECTION_META mock |

## 5. Findings

| Issue | File | Severity | Recommendation |
|---|---|---|---|
| Artifact file committed (`.orig`) | `src/components/shared/SelectableCard.tsx.orig` | MEDIUM | Remove file and add `*.orig` to `.gitignore` |
| Architect Condition 2 not addressed — `resolveSection` duplication remains in search page | `src/app/(public)/search/page.tsx:49-55` | MEDIUM | Replace inline resolver with `SECTION_META[resolveSectionFromSearchParams(searchParams)].active ? resolved : 'food'` to use canonical resolver |
| Missing `sections.soon` in ps.ts, ur.ts, tr.ts locales | `src/translations/ps.ts:144`, `src/translations/ur.ts:144`, `src/translations/tr.ts:144` | LOW | Add `"soon"` key to remaining locales to avoid raw key fallback display |
| Disabled buttons retain unconditional `onClick` handler | `src/features/search/components/SectionSelector.tsx:63` | LOW | Consider `onClick={!isDisabled ? () => onSectionChange(value) : undefined}` for clarity (works correctly with native `disabled` attribute) |

## 6. Positive Highlights

- **Config-driven approach is clean.** `SECTION_META` in `sectionFilters.ts` is the right abstraction — single source of truth, same pattern as `SECTION_FILTER_CONFIG`.
- **Defense-in-depth correctly implemented.** Three layers: route page redirect (server), SectionSelector disabled (client UI), callback guards (Header + Search page + providers page).
- **Architect Condition 1 fully satisfied.** `providers/page.tsx:46` guards against direct `/providers?section=ummah` bypass.
- **Good test coverage.** 4 new SectionSelector tests, updated Header tests, updated search page tests for inactive section resolution.
- **Translation key naming** (`sections.soon`) is consistent with existing keys.
- **`getSectionLabel` simplification** in SectionSelector (removed hardcoded switch, uses `SECTION_META[section].labelKey`) is a nice maintainability improvement.

## 7. Decision

- **Verdict**: APPROVED WITH MINOR ISSUES
- **Conditions for next phase**: Remove `src/components/shared/SelectableCard.tsx.orig` from the branch. Consider addressing resolveSection duplication as tech debt. Both are non-blocking for merge.
