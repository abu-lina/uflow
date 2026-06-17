---
ID: 184
Origin: 184
UUID: 5e73fa96
Status: Active
---

# Implementation: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | Implementer | Initial implementation of section deactivation feature |

## 2. Files Modified

| File | Description |
|---|---|
| `src/config/sectionFilters.ts` | Added `SectionMeta` interface and `SECTION_META` constant (active flags + label/badge keys) |
| `src/translations/en.ts` | Added `"soon": "Soon"` under `sections` |
| `src/translations/de.ts` | Added `"soon": "Demnächst"` under `sections` |
| `src/translations/ar.ts` | Added `"soon": "قريباً"` under `sections` |
| `src/features/search/components/SectionSelector.tsx` | Added disabled state + "Soon" badge for inactive sections; simplified `getSectionLabel` to use `SECTION_META` |
| `src/app/(public)/ummah/page.tsx` | Added redirect to `/food` when SECTION_META.ummah.active is false |
| `src/app/(public)/stores/page.tsx` | Added redirect to `/food` when SECTION_META.store.active is false |
| `src/components/layout/Header.tsx` | Added defensive guard in `handleSectionChange` for inactive sections |
| `src/app/(public)/search/page.tsx` | Added defensive guard in `handleSectionChange` + updated `resolveSection` to fall back to 'food' for inactive sections |
| `src/app/(public)/providers/page.tsx` | Added guard to fall back to 'food' when resolved section is inactive (Architect Condition 1) |
| `src/__tests__/components/SectionSelector.test.tsx` | Added tests: disabled tabs, Soon badge, no-op click; updated mock to include `sections.soon` |
| `src/__tests__/components/Header.test.tsx` | Updated ummah/store click tests to expect no navigation (no-op) |
| `src/__tests__/app/search-page-storage.test.tsx` | Added `SECTION_META` to mock |
| `src/__tests__/regression/plan172-location-persistence.test.tsx` | Added `SECTION_META` to mock |
| `src/app/(public)/search/page.test.tsx` | Updated mock type from `'business'` to `'store'`; updated tests for inactive section resolution |
| `src/__tests__/app/(public)/search/page-meal-search.test.tsx` | Updated mock type from `'business'` to `'store'`; updated tests for inactive section behavior |

## 3. TDD Compliance

| Step | Test Written First | Test Passes | Code Implemented |
|---|---|---|---|
| SECTION_META config | N/A (config, no behavioral change) | N/A | Yes |
| Translation keys | N/A (config, no behavioral change) | N/A | Yes |
| SectionSelector disabled + badge | Yes | Yes (7/7) | Yes |
| Route page redirects | N/A (server component, covered by architect) | N/A | Yes |
| Header guard | N/A (defensive, covered by Header.test.tsx update) | Yes | Yes |
| Search page guard | Yes (updated existing tests) | Yes | Yes |
| providers/page.tsx guard | N/A (architect condition, covered by type system) | Yes | Yes |

## 4. Verification

- Type check passed: yes
- SectionSelector tests pass: yes (7/7)
- All tests pass: yes (1758 passed, 22 skipped, 214 test files)

## 5. Test Evidence

```
✓ src/__tests__/components/SectionSelector.test.tsx (7 tests) 99ms

 Test Files  1 passed (1)
      Tests  7 passed (7)

✓ 214 passed | 2 skipped (216)
✓ 1758 passed | 22 skipped (1780)
```

## 6. Commit

- Branch: feature/184-deactivate-ummah-stores
- Commit message: feat: deactivate ummah and stores sections with Soon badge (ID 184)
