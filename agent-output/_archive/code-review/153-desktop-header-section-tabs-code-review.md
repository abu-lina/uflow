# Code Review: Plan 153 — Desktop Header Section Tabs

**Reviewer**: AI Agent  
**Date**: 2026-06-06  
**Plan**: 153 — Desktop Header Section Tabs  
**Verification**: `npx tsc --noEmit` passes (no errors), 22/22 tests pass

---

## Files Reviewed

| File | Lines | Role |
|------|-------|------|
| `src/components/layout/Header.tsx` | +SectionSelector above SearchBar | Added section tab row |
| `src/features/search/components/SearchBar.tsx` | +SlidersHorizontal button | Added filter navigation button |
| `src/__tests__/components/Header.test.tsx` | 42 lines new | Section tab tests |
| `src/__tests__/components/SearchBar.test.tsx` | +Sliders button tests | Filter button tests |
| `src/__tests__/utils/test-utils.tsx` | +mockRouterPush export | Shared mock utility |

Also read (context): `SectionSelector.tsx`, `sectionFilters.ts`, `search-provider.tsx`, `sectionIconRenderers.tsx`, `LanguageProvider.tsx`, translation files.

---

## Findings

### 🔴 Critical

None.

### 🟡 Major

None.

### 🔵 Minor

#### M1. Stale comment in `SectionSelector.tsx:23`

> `* The internal section value for "Stores" remains 'business' throughout the data model.`

The canonical `Section` type is `'food' | 'ummah' | 'store'` (defined in `sectionFilters.ts:14`). The value `'business'` does not appear anywhere in the Section type or constants. The comment is misleading — the data model uses `'store'` everywhere. Should read:

> `* The internal section value for "Stores" is 'store'.`

#### M2. German translations for section labels are English placeholders

`src/translations/de.ts:141-144` (and similarly in en.ts):

```json
"sections": {
    "food": "Food",
    "ummah": "Ummah",
    "stores": "Stores"
}
```

The German file contains English strings. These are now user-facing via `SectionSelector` in the header. Should be `"Essen & Trinken"` (or `"Essen"`), `"Gemeinschaft"`, `"Geschäfte"` or equivalent native DE labels.

**Note**: This is pre-existing (section translations existed before Plan 153), but Plan 153 makes them visible in the header for the first time. Not a regression, but worth fixing now.

#### M3. Header section tab test fragile to translation changes

`Header.test.tsx:20-22` uses regex queries that match against the fallback translation key:

```typescript
screen.getByRole('tab', { name: /food/i })
```

This matches because `t('sections.food')` currently resolves to `"Food"` (English placeholder). If translations were corrected to German `"Essen"`, this test would break. Consider matching by `role="tab"` + count or using a data attribute instead.

#### M4. Sliders button test coupled to provider default

`SearchBar.test.tsx:223-228` asserts navigation to `/search?section=food`. This depends on `SearchProvider` defaulting `selectedSection` to `'food'` (which it does per D9 spec). Not a bug, but the coupling should be documented or made explicit via a test setup override.

---

## Verdict

**APPROVED** with minor/cosmetic issues noted.

The implementation is correct, type-safe, properly i18n'd (keys exist in all 6 languages), follows ARIA tab pattern with `role="tablist"`/`role="tab"`/`aria-selected`, and passes all type checks and tests. The sliders filter button uses a translated aria-label and navigates correctly.

### Items to address before closing

- [ ] Fix stale comment in `SectionSelector.tsx:23` (`'business'` → `'store'`)
- [ ] Consider correcting DE translations for `sections.*` keys to native German
- [ ] Document test fragility (M3) in a comment or switch to a more stable query

None of these are blocking — APPROVED.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Pass (0 errors) |
| Header tests (4) | ✅ Pass |
| SearchBar tests (18) | ✅ Pass |
| Total tests | 22/22 ✅ |
