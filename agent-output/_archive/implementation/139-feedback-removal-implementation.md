---
ID: 139
Origin: 139
UUID: 86f5688e
Status: Active
---

# Implementation: Remove Feedback Section

## Summary
Removed the empty Feedback placeholder section from the provider detail page.

## Changes Made
- `src/features/providers/components/ProviderDetailSections.tsx` — Removed lines 228-230 (Feedback ExpandSection block). TrustBadgesSection now flows directly into Nearby section.
- `src/translations/en.ts` — Removed `"feedback"` from `providerDetail.sections` and `"noFeedback"` from `providerDetail.empty`.
- `src/translations/de.ts` — Same key removals.
- `src/translations/ar.ts` — Same key removals.
- `src/translations/tr.ts` — Same key removals.
- `src/translations/ur.ts` — Same key removals.
- `src/translations/ps.ts` — Same key removals.
- `src/__tests__/components/ProviderDetailEnhancements.test.tsx` — Removed `expect(screen.getByText('Feedback')).toBeInTheDocument()` assertion.
- `src/__tests__/features/providers/ProviderDetailSections.test.tsx` — Fixed pre-existing test bug: button name changed from `/Halal-Prüfung/` to `/Halal Check/` to match actual German translation.

## Verification Results
```
npm run type-check  → clean (0 errors)
npm run lint:check  → 0 errors, 59 pre-existing warnings
npm test            → 164 passed, 2 skipped, 1300 passed, 22 skipped
```
