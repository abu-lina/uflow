# Open Actions & Deferred Work

This file tracks low-priority technical debt, deferred improvements, and follow-up work items that are not blocking current releases.

**Format**: Each entry should include:
- Brief title/description
- Source (plan ID, issue number, or decision reference)
- Trigger condition (when to address this)
- Priority (LOW/MEDIUM)

---

## Deferred Tech Debt

### Provider Detail Components — DRY Cleanup for ExpandSection Pattern

**Source**: Plan 092, Decision D4  
**Priority**: LOW  
**Trigger**: Next touch to any of the 3 provider detail components, OR a dedicated maintenance plan  

**Context**: Three provider detail components (`ProviderDetailPage.tsx`, `ProfileProviderDetailPage.tsx`, `ProviderDetailModal.tsx`) have inline implementations of the expand/collapse pattern that was extracted into the shared `ExpandSection` component (Plan 092 M1). Refactoring them to use `ExpandSection` would eliminate duplication and ensure future visual consistency.

**Files to refactor**:
- `src/components/providers/ProviderDetailPage.tsx` (lines ~516-550: offers section)
- `src/components/providers/ProfileProviderDetailPage.tsx` (lines ~247-295: similar pattern)
- `src/components/providers/ProviderDetailModal.tsx` (lines ~625-680: similar pattern)

**Steps**:
1. Replace inline expand pattern with `<ExpandSection title={t('providers.weOffer')}>...</ExpandSection>`
2. Remove inline `expandedOffers`/`expandedNeeds`/`expandedBarakah` state variables
3. Verify visual consistency (especially separator line between header and body)
4. Add regression tests for the refactored components

---

## Future Work (No Plan Yet)

_(empty)_
