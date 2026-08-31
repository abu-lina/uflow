---
ID: 108
Origin: 108
UUID: b7e3a91f
Status: Committed
---

# Plan 108 — Hide Wer Accordion for Stores Section on /search

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Plan ID        | 108                                                                   |
| Target Release | v0.10.36 (v0.10.35 was already released for Plan 107; confirmed at DevOps Stage 1) |
| Epic Alignment | Search Page UX Refinement                                             |
| Related Issues | None                                                                  |
| Classification | Bugfix                                                                |
| Pipeline       | Abbreviated                                                           |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/174                         |
| Created        | 2026-04-27T15:00Z                                                     |

## Changelog

| Date                | Author  | Change                         |
| ------------------- | ------- | ------------------------------ |
| 2026-04-27T15:00Z   | planner | Initial plan created           |
| 2026-04-27T15:15Z   | planner | Revised per critique: Finding 1 (openAccordion reset) added to M1 AC; Finding 2 (mock note) added to M2 |
| 2026-04-27T15:20Z   | implementer | Implementation started; status set to In Progress |
| 2026-04-27T17:45Z   | uat     | UAT approved; status set to UAT Approved; ready for DevOps Stage 1 |

---

## Value Statement and Business Objective

**As a** user searching for stores (businesses) on the /search page,
**I want** the "Wer:" (audience) accordion to be hidden when the Stores section is selected,
**so that** I am not presented with irrelevant Männer/Frauen/Kinder audience filtering that does not apply to store searches.

---

## Decision Record

1. **[RESOLVED]** Scope is limited to hiding the Wer accordion for `selectedSection === 'business'`. — Audience filtering (Männer/Frauen/Kinder) is a food/ummah concept; stores have no audience dimension.

2. **[RESOLVED]** Implementation uses conditional rendering (not CSS display:none) to fully unmount the Wer ExpandSection. — Consistent with how Filter accordion already conditionally renders section-specific content. Avoids hidden DOM nodes and unnecessary state updates.

3. **[RESOLVED]** The `werSelection` and `werResetSignal` state variables remain in the component even when Wer is hidden. — The clear-all handler resets them unconditionally, which is harmless. No state cleanup is needed on section switch since existing `useEffect` already resets relevant search state.

4. **[RESOLVED]** The `werAccordionTitle` derivation can continue to be computed unconditionally. — Minor compute cost, not worth conditional guarding. Keeps the diff minimal.

5. **[RESOLVED]** The Was? accordion for stores currently falls through to food-specific components (WasCategoryResults + WasMealResults). — This is a separate concern. See "Follow-Up Recommendations" below. Out of scope for this plan.

6. **[RESOLVED]** No database changes required. — This is a pure UI conditional rendering change.

---

## Assumptions

1. The three sections (`food`, `ummah`, `business`) are the complete set defined by `Section` type in `src/providers/search-provider.tsx`.
2. Ummah section behaviour is unchanged — Wer accordion remains visible for ummah.
3. Food section behaviour is unchanged — Wer accordion remains visible for food.

---

## Milestones

### Milestone 1: Conditionally Hide Wer Accordion for Business Section

**Objective**: When `selectedSection === 'business'`, the Wer ExpandSection is not rendered. For food and ummah, rendering is unchanged.

**Files to modify**:
- `src/app/(public)/search/page.tsx` — Wrap the Wer `<ExpandSection>` block in a conditional that excludes `business` section.

**Acceptance Criteria**:
- When `selectedSection === 'business'`, the Wer accordion heading and content are absent from the DOM.
- When `selectedSection === 'food'`, the Wer accordion renders as before.
- When `selectedSection === 'ummah'`, the Wer accordion renders as before.
- The "Clear all" button still functions correctly across all sections.
- The single-accordion-open constraint still works (no orphaned open state when switching sections).
- When switching to business section while `openAccordion === 'wer'`, `openAccordion` resets to `'was'` so the user is not left with all accordions collapsed. This should be handled in the existing section-switch `useEffect` (line ~377 of `page.tsx`).

### Milestone 2: Regression Tests

**Objective**: Add regression tests verifying the Wer accordion visibility per section.

**Files to modify**:
- `src/app/(public)/search/page.test.tsx` — Add test cases for:
  1. Wer accordion is hidden when business section is active.
  2. Wer accordion is visible when food section is active (existing behaviour, may already be implicitly covered).
  3. Clear-all from business section does not error (no Wer DOM to reset, but state reset is safe).

**Implementation Note**: The existing `vi.mock('next/navigation')` in `page.test.tsx` hardcodes `section=food`. Business section tests require a per-test override of `useSearchParams` (e.g., via a module-scoped variable, matching the pattern used for `enableSearchExpandShowAllPreview` in `FilterSection.test.tsx`).

**Acceptance Criteria**:
- New test(s) explicitly assert Wer accordion absence for business section.
- All existing tests continue to pass unchanged.
- `npm run type-check` passes.

### Milestone 3: Version Management

**Objective**: Update version and release artifacts to match target release.

**Tasks**: Update CHANGELOG entry, bump version in package.json (coordinated with DevOps at release time).

**Acceptance Criteria**: CHANGELOG reflects this change, version matches target release.

---

## State-Machine Coverage

The search page's accordion rendering has three section branches:

| Section    | Was? Accordion Content              | Wer Accordion | Filter Accordion Content |
| ---------- | ----------------------------------- | ------------- | ------------------------ |
| `food`     | WasCategoryResults + WasMealResults | **Visible** ✅ | FilterSection            |
| `ummah`    | WasServiceTypeResults               | **Visible** ✅ | UmmahFilterSection       |
| `business` | _(falls through to food — see note)_ | **Hidden** 🔧 | FilterSection (no muslim) |

- `food`: Not affected by this change — confirmed unbroken.
- `ummah`: Not affected by this change — confirmed unbroken.
- `business`: Wer accordion hidden — this is the fix target.

---

## Testing Strategy

- **Unit tests**: Regression tests in `page.test.tsx` verifying DOM presence/absence of Wer accordion per section. Test the clear-all flow from business section to confirm no errors.
- **Existing test suite**: All existing tests must pass. The current test suite mocks `section=food` by default — these remain unaffected.
- **Manual QA**: Verify on mobile viewport (320px–430px) that accordion layout remains correct with one fewer accordion in business section.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Accordion open state leaks when switching from food→business with Wer open | Low | Low | Existing `useEffect` on `selectedSection` resets query/selection. If `openAccordion === 'wer'` when switching to business, the accordion simply won't render (controlled mode, no orphan). Implementer should verify this edge case. |
| Future section additions forget to consider Wer visibility | Low | Medium | The conditional should be explicit (`selectedSection !== 'business'`) rather than an allowlist, so new sections get Wer by default. |

---

## Duration Estimates

| Phase          | Estimate    | Uncertainty |
| -------------- | ----------- | ----------- |
| Planning       | 30 min      | Low         |
| Implementation | 30–60 min   | Low         |
| QA / Testing   | 15–30 min   | Low         |
| Total          | ~1–2 hours  | Low         |

This is a small, focused change (1 file + 1 test file).

---

## Follow-Up Recommendations (Out of Scope)

**Was? accordion for stores**: Currently, when `selectedSection === 'business'`, the Was? accordion renders food-specific components (`WasCategoryResults` + `WasMealResults`). This means stores search shows food concepts and categories — clearly incorrect for a general business/store search. A follow-up plan should create a stores-specific Was? component (analogous to `WasServiceTypeResults` for ummah) or display a generic store search interface. This is a larger scope item requiring stores-specific search data and should be tracked separately.

---

## Release Strategy

Standalone (no other known non-closed plans for the target release at time of planning).

---

## Validation & Handoff Notes

- Implementer: The conditional wrap is a single-line change in `page.tsx` JSX.
- Verify the edge case where user has Wer accordion open, then switches section to business — the accordion should simply disappear without layout jank.
- Run full test suite (`npm test`) and type check (`npm run type-check`) before handoff.
