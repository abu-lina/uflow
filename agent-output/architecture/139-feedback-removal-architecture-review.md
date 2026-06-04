---
ID: 139
Origin: 139
UUID: 152a5112
Status: Active
---

# Architecture Review: Feedback Section Removal

## Summary

Removing the Feedback section from the provider detail page. The section currently renders a static placeholder ("No reviews yet.") with no backend integration, data fetching, or interactivity. Removal is a straightforward deletion — no wiring, state management, or layout dependencies to unwind.

## Files to Modify

| File | Change | Risk |
|------|--------|------|
| `src/features/providers/components/ProviderDetailSections.tsx` (lines 228-230) | Delete the `<ExpandSection>` block wrapping the two translation-key references | Low — isolated JSX, no wrapping logic |
| `src/translations/en.ts` (line 950, 1042) | Remove `feedback` and `noFeedback` keys | Low |
| `src/translations/de.ts` (line 950, 1042) | Same | Low |
| `src/translations/ar.ts` (line 950, 1043) | Same | Low |
| `src/translations/tr.ts` (line 950, 1043) | Same | Low |
| `src/translations/ur.ts` (line 950, 1043) | Same | Low |
| `src/translations/ps.ts` (line 950, 1043) | Same | Low |
| `src/__tests__/components/ProviderDetailEnhancements.test.tsx` (line 59) | Remove `expect(screen.getByText('Feedback')).toBeInTheDocument()` | Low — one assertion removal, rest of test unchanged |

## Coupling Analysis

- **No other consumers**: Grep across the entire `src/` tree confirms only `ProviderDetailSections.tsx` references `providerDetail.sections.feedback` or `providerDetail.empty.noFeedback`.
- **No layout breakage**: The Feedback `<ExpandSection>` is a sibling to six other sections (Values & Amenities, Menu, Opening Hours, TrustBadges, Nearby). Removing it collapses that gap naturally — the next sibling (`Nearby`) slots into the flow without any style adjustment.
- **No unused imports**: `ExpandSection` is still used by at least 6 other sections. No import becomes orphaned.
- **`review_feedback`** is a separate concept (admin moderation rejection reason) in a different schema. Not related.

## No-Go Concerns

- **None identified**. The section has no backend data source, no analytics tracking, no event handlers, and no feature flags wrapping it. It is dead code with a placeholder string.

## Verdict

**CLEARED** — no architectural, coupling, or maintainability concerns. Safe to remove.

## Recommendations

1. Remove the translation keys in the same commit to avoid dead-key lint warnings.
2. The adjacent test assertion should be removed in the same change set to keep CI green.
3. If a feedback feature is planned for the future, consider reserving the translation key namespace (`providerDetail.sections.feedback` / `providerDetail.empty.noFeedback`) in a design doc rather than leaving dead keys in production locales.
