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

### Wer Counter Reset via "Alles löschen" (Plan 103)

**Source**: Plan 103, Decision D2 / Critic F1  
**Priority**: MEDIUM  
**Trigger**: Next touch to `search/page.tsx` state management, or a dedicated "Wer search integration" plan  

**Context**: `WerAudienceFilter` (Plan 103) stores audience counter state locally via `useState`. The "Alles löschen" button in `search/page.tsx` (lines ~551–563) resets inline WAS/WO state but cannot reach `WerAudienceFilter`'s internal counters. After Plan 103 ships, pressing "Alles löschen" will leave Wer counters at non-zero values while WAS/WO fields appear empty — a cosmetic inconsistency. No search-result data integrity issue (search button requires `selectedWas`; counters are not yet wired to the query).

**Steps to resolve**:
1. Hoist `counts: { maenner: number; frauen: number; kinder: number }` state (or a `resetWer` callback) up to `search/page.tsx`
2. Pass `counts` and `onCountChange` props down to `WerAudienceFilter` (or use a React `useImperativeHandle` / context approach)
3. Add Wer counter reset calls to the "Alles löschen" `onClick` handler
4. Update `WerAudienceFilter` unit tests for the controlled-component pattern
5. Add a regression test proving "Alles löschen" resets all three counters to 0

---

## Future Work (No Plan Yet)

### Cross-Surface Location Default Consistency (`/providers`, `/saved`)

**Source**: Plan 101 critique, finding F-LOW-3  
**Priority**: LOW  
**Trigger**: Next touch to `SearchBar.tsx` or dedicated UX-consistency maintenance plan  

**Context**: Plan 101 adds onboarding-city defaulting to the dedicated `/search` page Wo field. The shared `SearchBar.tsx` used by `/providers` and `/saved` still defaults to all locations (`LOCATION_ALL`), creating cross-surface inconsistency.

**Follow-up scope**:
1. Define a single source of truth for default-location hydration (likely `selectedCity` storage read with fallback precedence)
2. Apply parity behavior to `SearchBar.tsx` consumers (`/providers`, `/saved`)
3. Add regression tests to prove consistent default-location UX across all search surfaces
