---
ID: 201
Origin: 201
UUID: 3e8b5fa2
Status: Released
---

# Plan 201 — Provider Detail Sections: Accordion Exclusivity & Uniform Gap Spacing

## Plan Header

| Field          | Value |
|----------------|-------|
| Plan ID        | 201 |
| Target Release | next available patch after current `origin/main` v0.15.4; confirm at DevOps Stage 1 |
| Epic Alignment | Provider Detail Page UX Quality |
| Related Issues | https://github.com/abu-lina/uflow/issues/290 |
| Classification | Bugfix |
| Pipeline       | Abbreviated (6 phases) |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/290 |
| Created        | 2026-08-05T00:00Z |

## Changelog

| Date | Author | Action | Notes |
|------|--------|--------|-------|
| 2026-08-05T00:00Z | analyst | Status: Active | RCA doc created: 201-provider-sections-rca.md |
| 2026-08-05T00:00Z | planner | Status: Active | Plan created from analysis 201 |
| 2026-08-05T00:00Z | planner | GitHub Issue created | https://github.com/abu-lina/uflow/issues/290 |
| 2026-08-05T00:00Z | implementer | Status: In Progress | Implementation started (Phase 3) |
| 2026-08-05T00:00Z | code-reviewer | Status: Code Review Approved | Verdict: APPROVED_WITH_COMMENTS — F1 (Weitere Standorte i18n, pre-existing, risk accepted) |
| 2026-08-05T00:00Z | qa | Status: QA Complete | Verdict: PASS — 14/14 tests pass; TDD cycle verified; both bugs directly tested; manual UAT deferred to next phase |
| 2026-08-05T00:00Z | uat | Status: UAT Approved | Verdict: APPROVED_FOR_RELEASE — Value delivery confirmed; both bugs fixed; all acceptance criteria met; manual validation (DF-1) + CI build (DF-2) required before tag |

---

## Value Statement and Business Objective

As a user visiting the provider detail page, I want the information sections to behave as a proper exclusive accordion and to display with uniform spacing, so that I can quickly scan and compare provider details without being confused by sections unexpectedly stacking open or by irregular visual rhythm.

---

## Objective

Fix two UI regressions on `ProviderDetailSections` that were left incomplete after Plan 195:

1. **Accordion exclusivity**: Three of six `ExpandSection` instances are in uncontrolled mode and do not participate in the shared `openSection` state. Opening them does not close others; they cannot be closed by others.
2. **Uniform gap spacing**: The internal flex container uses `gap-8` (32 px) between sections, while the mobile page wrapper above uses `mt-4` (16 px) before the first section — creating a visible rhythm inconsistency.

Both bugs are confined to one component file. No new features, no schema changes, no API changes.

---

## Analysis Reference

`agent-output/analysis/201-provider-sections-rca.md` — Status: Active. All findings are L1 Proven (static code inspection at commit `f45512e9`).

---

## Release Strategy

Standalone — no other known plans target v0.15.5 at time of writing.

---

## Assumptions

1. `ExpandSection` API (controlled mode via `isOpen`/`onToggle`) is already present and tested; no changes to that component are required.
2. The `openSection` state key set `{'halal', 'values', 'menu-offers'}` can be extended by adding three new keys — no refactor of existing keys is needed.
3. The `gap-4` (16 px) target matches the established `mt-4` mobile spacing pattern throughout `ProviderDetailPage.tsx`. This is the desired uniform measurement, per the user's stated goal ("matching the first-to-Halal-Check gap").
4. Desktop modal (`ProviderDetailModal.tsx`) is not modified — the Analyst confirmed the desktop path is already consistent at 32 px end-to-end. The `gap-4` change to `ProviderDetailSections` creates a minor hierarchy difference on desktop (32 px Barakah→Halal, 16 px between accordion items), which is acceptable as a visual hierarchy signal.
5. No mobile-responsive breakpoint override is needed; the single `gap-4` class is sufficient.

---

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| 1 | Fix both bugs in the same commit/plan — they affect the same component and the same test file | [RESOLVED] Minimal blast radius; co-location reduces review surface |
| 2 | Apply `gap-4` (Option a from RCA) rather than increasing `mt-4` in `ProviderDetailPage.tsx` (Option b) | [RESOLVED] User explicitly said "match the first-to-Halal-Check gap" = 16 px; Option a fulfils the stated reference; Option b would make outer gap 32 px, contradicting the reference |
| 3 | Do not close or supersede Plan 195 — it shipped what it intended; this plan addresses a missed scope that was not in 195's acceptance criteria | [RESOLVED] Creates a clean audit trail; 195 stays Released |
| 4 | `ExpandSection` component is not modified | [RESOLVED] Controlled-mode API is already in place; changing the shared component risks regressions across other usages (search filters, etc.) |
| 5 | `TrustBadgesSection` (line 305) is not modified — it is a non-accordion card in the gap container and benefits automatically from the gap change | [RESOLVED] Analyst confirmed no change needed |

---

## State-Machine Coverage (Accordion Branches)

The accordion state machine has 7 states: `null` (all closed) + one open state per section.

| Branch | Key | Mode before fix | Mode after fix | Notes |
|--------|-----|-----------------|----------------|-------|
| All closed | `null` | ✅ works | ✅ unchanged | Initial state |
| Halal Check open | `'halal'` | ✅ controlled | ✅ unchanged | Default open on mount |
| Values & Amenities open | `'values'` | ✅ controlled | ✅ unchanged | |
| Menu / Offers open | `'menu-offers'` | ✅ controlled | ✅ unchanged | |
| Opening Hours open | `'opening-hours'` | ❌ uncontrolled | ✅ will be fixed | M1 |
| Weitere Standorte open | `'standorte'` | ❌ uncontrolled | ✅ will be fixed | M1 — conditional on `locations.length > 0` |
| Nearby open | `'nearby'` | ❌ uncontrolled | ✅ will be fixed | M1 |

All six section branches are in scope. The null/all-closed state is implicitly tested whenever toggling a section that was already open.

Note: `'standorte'` branch only appears when the provider has `locations.length > 0`. Tests that exercise this branch must supply a provider with at least one location.

---

## Plan

### M1 — Fix Accordion Exclusivity

**Objective**: Convert the three uncontrolled `ExpandSection` instances to controlled mode using the existing `openSection` state.

**File**: `src/features/providers/components/ProviderDetailSections.tsx`

**Scope**:
- Opening Hours section (line 283): add `isOpen` and `onToggle` using key `'opening-hours'`
- Weitere Standorte section (line 289): add `isOpen` and `onToggle` using key `'standorte'`
- Nearby section (line 307): add `isOpen` and `onToggle` using key `'nearby'`

The outer `<div id="standorte-section">` wrapper around Weitere Standorte is NOT modified — only the `ExpandSection` element inside it receives the props.

**Acceptance Criteria**:
- Tapping any closed section opens it and closes all others
- Tapping an open section closes it (state → `null`)
- Halal Check is default-open on initial render
- All six sections (halal, values, menu-offers, opening-hours, standorte, nearby) participate in the shared state
- `ExpandSection` component receives no changes

---

### M2 — Fix Uniform Gap Spacing

**Objective**: Replace the 32 px inter-section gap with 16 px to match the mobile page layout rhythm.

**File**: `src/features/providers/components/ProviderDetailSections.tsx`

**Scope**: Line 214 — change `gap-8` to `gap-4` on the root flex container.

No changes to `ProviderDetailPage.tsx` or `ProviderDetailModal.tsx`.

**Acceptance Criteria**:
- Visual spacing between all accordion cards is uniform at 16 px (gap-4)
- On mobile, the gap above Halal Check (16 px from `mt-4` wrapper) matches the gap between sections
- Desktop modal layout is not visually broken; minor hierarchy difference (32 px outer, 16 px inner) is acceptable

---

### M3 — Test Coverage

**Objective**: Ensure the three previously uncovered accordion branches are validated by automated tests, and add a regression test for the gap change.

**File**: `src/__tests__/features/providers/ProviderDetailSections.test.tsx`

**Scope**:
- Add accordion exclusivity tests covering the three new controlled sections (opening-hours, standorte, nearby)
- Verify that opening one of the newly controlled sections closes the previously open section
- Include a test that supplies `locations` data to exercise the `'standorte'` branch
- `gap-4` class presence test on the root container element (snapshot or direct query)

**What NOT to test** (not regression paths for these bugs):
- `ExpandSection` internal behaviour (already covered by its own tests)
- Desktop modal rendering (separate component, separate test file)

**Acceptance Criteria**:
- All existing tests continue to pass (≥ 12/12 from Plan 195)
- New tests cover all six accordion branches: open + exclusive-close verified for each
- `tsc --noEmit` clean
- `npm run lint` clean

---

### M4 — Version and Release Artifacts

**Objective**: Increment the patch version and document the release.

**Files**: `package.json`, `CHANGELOG.md`

**Scope**:
- Bump `version` in `package.json` to the next available patch (confirm v0.15.5 availability at DevOps Stage 1 via `git fetch --tags`)
- Add `CHANGELOG.md` entry documenting both fixes

**Acceptance Criteria**:
- `package.json` version matches the target release tag
- `CHANGELOG.md` entry exists for v0.15.5 covering both bug fixes

---

## Testing Strategy

Unit tests (Vitest + React Testing Library) are the correct level for both bugs:

- **Bug 1 regression tests**: Click-based interaction tests that open a section and assert that the previously open section is now closed (`aria-expanded="false"` or content not in DOM). Six sections × at least one exclusivity assertion each.
- **Bug 2 regression test**: Assert the presence of `gap-4` class (or absence of `gap-8`) on the root container.

No integration or e2e tests required — both bugs are pure component-level state/style regressions with no Supabase, routing, or network dependencies.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `'standorte'` branch always skipped in tests if locations not supplied | Medium | Test coverage gap | Implementer must provide a mock `locations` array in the test fixture |
| `gap-4` change affects visual appearance of `TrustBadgesSection` card spacing on desktop | Low | Cosmetic | Analyst confirmed acceptable; QA verifies desktop modal visually |
| Reducing gap from 32 px to 16 px may feel too tight on some screen densities | Low | UX regression | QA reviews on UAT at the specified provider URL |

---

## Duration Estimates

| Phase | Estimate | Uncertainty Driver |
|-------|----------|-------------------|
| Analysis | Complete | — |
| Planning | Complete | — |
| Implementation | 30–60 min | 4 prop additions + test additions; straightforward |
| Code Review | 15–30 min | Small diff, single file |
| QA | 20–40 min | UAT verification on mobile + desktop |
| DevOps | 15–30 min | Standard commit + tag + CHANGELOG |
| **Total** | **~2–3 hours** | Low complexity; single-file changes |
