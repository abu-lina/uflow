---
ID: 139
Origin: 139
UUID: f047d90a
Status: Active
---

# Plan: Remove Feedback Section

## Summary
Remove the empty Feedback placeholder section from the provider detail page. The section shows "No reviews yet" with no backend integration — it's dead code.

## Tasks

### Task 1: Remove Feedback section from ProviderDetailSections.tsx
- **File**: `src/features/providers/components/ProviderDetailSections.tsx`
- **Action**: Delete lines 228-230
- **Lines to remove**:
  ```
  <ExpandSection title={t('providerDetail.sections.feedback')}>
    <p className="pt-3 text-sm text-[#7a7a7a]">{t('providerDetail.empty.noFeedback')}</p>
  </ExpandSection>
  ```
- **Verification**: Component still renders without errors, other sections unaffected

### Task 2: Remove translation keys from all locale files
- **Files**: 
  - `src/translations/en.ts`
  - `src/translations/de.ts`
  - `src/translations/ar.ts`
  - `src/translations/tr.ts`
  - `src/translations/ur.ts`
  - `src/translations/ps.ts`
- **Action**: Remove `"feedback"` key from `providerDetail.sections` object AND remove `"noFeedback"` key from `providerDetail.empty` object in each file
- **Note**: Remove only the key-value pairs, not surrounding keys. Ensure valid JSON/object syntax after removal (no trailing commas).

### Task 3: Update test assertion
- **File**: `src/__tests__/components/ProviderDetailEnhancements.test.tsx`
- **Action**: Remove line 59: `expect(screen.getByText('Feedback')).toBeInTheDocument();`
- **Verification**: Test still passes and still checks that other sections render correctly

## Dependencies
None — all changes are isolated.

## Verification
1. `npm run type-check` — no type errors
2. `npm run lint:check` — no lint errors
3. `npm test` — all tests pass
4. Provider detail page renders without the Feedback section
