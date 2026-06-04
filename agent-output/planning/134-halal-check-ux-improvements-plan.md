---
ID: 134
Origin: 134
UUID: c9e4f2d3
Status: Active
---

# Plan 134 — Halal Check Section UX Improvements

| Field | Value |
|-------|-------|
| Plan ID | 134 |
| Classification | Feature |
| Pipeline | Full 8-phase |
| Session | S134-halal-check-section |
| Created | 2026-06-03 |

## Value Statement

**As a** Muslim community user viewing a provider listing,
**I want to** see halal verification info in a consistent, accessible, and clearly structured layout without dead links or confusing redundancy,
**so that** I can quickly assess a provider's halal status at a glance.

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Keep HalalTrustBanner** as baseline gate | ADR 133: "Separate Gate from Transparency" — banner establishes all listings are halal; section shows verification depth |
| D2 | **Fix banner position** (move above sections on mobile) | ADR 133 specified "banner above sections" but mobile page still has it below — inconsistent with modal |
| D3 | **Remove dead `/halal` link** from banner | Route doesn't exist; no plans to create it; removing the link is cleaner than linking to 404 |
| D4 | **Add tier badge to ExpandSection title** | Users should see verification level without expanding the section |
| D5 | **Move TrustBadgesSection out of "Halal Check"** | Community trust badges are not halal verification — separate concerns |

## Plan

### M1: Fix HalalTrustBanner position + remove dead link

**Files**: `src/components/providers/ProviderDetailPage.tsx` (2 locations), `src/features/providers/components/HalalTrustBanner.tsx`

**Changes**:
1. In `ProviderDetailPage.tsx` (mobile layout, line 591-594): Move `<HalalTrustBanner />` ABOVE `<ProviderDetailSections />` — consistent with ADR and modal
2. In `ProviderDetailPage.tsx` (desktop layout within mobile page, line 1028-1030): Move `<HalalTrustBanner />` ABOVE `<ProviderDetailSections />`
3. In `HalalTrustBanner.tsx`: Remove the `<Link>` to `/halal` — it's a dead route
4. Update `HalalTrustPopup.test.tsx`: Remove assertion on "learn more" link (will be removed from banner)

**Acceptance Criteria**:
- [ ] Banner renders ABOVE sections in all layouts (mobile + desktop in detail page, modal)
- [ ] No dead `/halal` link in the rendered HTML
- [ ] All existing tests pass

### M2: Add tier badge to ExpandSection title

**Files**: `src/features/providers/components/ProviderDetailSections.tsx`

**Changes**:
1. Compute the tier (bronze/silver/gold) from provider fields (same logic as `computeSealTier`)
2. Pass localized tier title as a subtitle/badge in the ExpandSection title
3. Show format: "Halal Check · Online Checked" (for bronze), "Halal Check · On-site Checked" (for silver), "Halal Check · Certificate Provided" (for gold)

**Acceptance Criteria**:
- [ ] Section title shows tier level in collapsed state
- [ ] Works for all 3 tiers correctly
- [ ] Translation keys used for tier labels
- [ ] No layout breakage

### M3: Move TrustBadgesSection out of Halal Check section

**Files**: `src/features/providers/components/ProviderDetailSections.tsx`

**Changes**:
1. Move `<TrustBadgesSection />` to render after the "Halal Check" ExpandSection but within its own wrapper
2. TrustBadgesSection already handles empty state (returns null when no badges) so no extra condition needed

**Acceptance Criteria**:
- [ ] Trust badges render outside the "Halal Check" section
- [ ] When no badges exist, no empty space is rendered
- [ ] Badges still render correctly when they exist

### M4: Test updates + gate verification

**Files**: Tests as needed

**Changes**:
1. Update `ProviderDetailSections.test.tsx` for expanded section title / TrustBadgesSection position
2. Update `HalalTrustPopup.test.tsx` for removed link
3. Run full test suite, type-check, lint

## Testing Strategy

| Type | Scope | Coverage |
|------|-------|----------|
| Unit | Existing ProofTierCard/ProviderDetailSections tests | Confirm no regressions |
| Integration | ProviderDetailSections with tier badge | Section title displays correctly |
| Unit | HalalTrustBanner without link | No dead link rendered |
| Existing | Full test suite | 1276+ tests pass |
| Type safety | `npm run type-check` | Clean |
| Lint | `npm run lint` | Clean |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Moving TrustBadgesSection breaks layout tests | Low | Medium | Update test assertions for new position |
| Removing `/halal` link breaks Popup focus-trap test | Low | High | Update test's `getByRole('link')` assertion — the popup still has a close button for focus cycling |
| Tier badge in section title changes string for existing ExpandSection | Low | Low | ExpandSection accepts ReactNode title, so we can pass a fragment with badge |
