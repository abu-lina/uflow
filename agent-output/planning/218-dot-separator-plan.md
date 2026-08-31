---
ID: 218
Origin: 218
UUID: 377700d3
Status: QA Complete
---

# Plan 218 — Lucide "Dot" separator between open tag and distance on ProviderCard

| Field | Value |
|-------|-------|
| Plan ID | 218 |
| Target Release | v0.15.18 |
| Epic Alignment | Near-me search UX (extends Plan 196 distance badge + Plan 217 home near-me list) |
| Status | QA Complete |
| Related Issues | None |
| Branch | feature/218-near-me-list-dot-separator |

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-08-17 | Planner | Opened plan. Decisions resolved (dot size/color, icon library, scope, guard, testid). Awaiting Architect review. |
| 2026-08-17 | Code Reviewer | Code review approved. Implementation matches plan; no findings. |
| 2026-08-17 | QA | QA Complete. Independent test execution (64 targeted + 1929 full-suite pass), static gates clean, release blockers clear. Verdict: APPROVED FOR RELEASE, UAT device check UAT-218-1 pending. |

## Release Strategy

This plan targets **v0.15.18**, the same release as **Plan 217** (`agent-output/planning/217-near-me-list-fix-plan.md`, currently `Status: QA Complete`, not yet closed). Plan 217 is already merged to `main` (commit `ba79138f`) and `origin/main:package.json` is already `0.15.18`, so no version bump is required in this plan. Both plans ship together in v0.15.18; DevOps stages the single release after both land.

## Version Pre-Flight

Ran 2026-08-17:

```
git fetch origin --tags
git tag --list "v*" | sort -V | tail -5
# v0.15.13  v0.15.14  v0.15.15  v0.15.16  v0.15.17
git show origin/main:package.json | grep '"version"'
# "version": "0.15.18",
```

`origin/main` is already at `0.15.18` (unreleased; latest tag is `v0.15.17`). This change is an unreleased increment on the existing 0.15.18 branch base. **No version bump in this plan.** The next available patch after current `origin/main` (0.15.18) would be `0.15.19`, but that is out of scope; DevOps decides at release staging.

## Value Statement and Business Objective

As a user browsing the home near-me list or search-page near-me results, I want a small dot separator between the open/closed status and the distance badge on each provider card, so that the two fields read as two distinct pieces of information instead of one run of text.

## Objective

Insert a lucide `Dot` icon into the shared `ProviderCard` flex row between the open-status label and the distance badge. The dot renders only when **both** fields are visible. Because the change lives in the shared card, both the home near-me list (`HomeNearMeList`) and the search-page near-me grid (`NearMeResultsGrid`) receive it automatically; `HomeListView` (no distance) is unaffected. No prop gating.

## Context

- `src/components/providers/ProviderCard.tsx:446-461` renders the open status (lines 448-454) and the distance badge (lines 455-459) in one flex row `className="mt-0.5 flex items-center gap-2"` with `data-testid="provider-open-status"`.
- The distance badge is opt-in via the `distanceKm` prop and rendered only when `formatDistance(distanceKm)` returns non-null (`distanceLabel`).
- The open status renders only when `opening_hours` are present (`openStatus.visible === true`).
- The file currently imports `@iconify/react` (`Icon`, line 7) for all existing icons. The new dot uses `lucide-react` per the documented standard, so this adds a second icon import to the file.

## Decision Record

1. **[RESOLVED] Icon library: use `lucide-react` `Dot`, not `@iconify/react`.** Rationale: `ICON_USAGE_STANDARDS.md` mandates Lucide for all icons and the user asked for "the standard icon library"; the documented standard wins over the file's legacy iconify convention.

2. **[RESOLVED] Do not convert existing ProviderCard iconify icons.** Rationale: scope discipline (KISS/YAGNI) — this plan adds one Lucide import for the dot only; converting the bookmark/halal/moderation icons is out of scope and noted in the mixed-import acknowledgement below.

3. **[RESOLVED] Dot size: `h-icon-sm w-icon-sm` (20px).** Rationale: lucide `Dot` is `r=1` with `stroke-width=2` in a 24px viewBox (~3.3px visible dot at 20px), which visually matches a text middot at `text-sm` and follows the documented `icon-*` token convention. Contingency (not an open decision): if UAT judges the dot too subtle, the Implementer may bump to `h-icon-md w-icon-md` (24px, ~4px) as a one-line follow-up without a new plan.

4. **[RESOLVED] Dot color: `text-text-muted`.** Rationale: matches the distance badge (`text-text-muted`, ProviderCard.tsx:456), keeping the separator visually subordinate to the colored status text and identical to the field it accompanies.

5. **[RESOLVED] Scope: shared `ProviderCard`, no prop gating.** Rationale: user confirmed both near-me surfaces get the dot; `HomeListView` passes no `distanceKm`, so it naturally renders no dot. Adding an opt-in prop would violate YAGNI.

6. **[RESOLVED] Render guard: `openStatus.visible && distanceLabel`.** Rationale: prevents a dangling dot next to a single field when only one of the two is visible.

7. **[RESOLVED] Add `data-testid="provider-distance-separator"` to the dot.** Rationale: matches the existing testid convention (`provider-distance`, `provider-open-status`) and gives tests a precise, non-fragile target without disturbing existing queries.

## Exact JSX Change (ILLUSTRATIVE ONLY)

Add one import (after `ProviderCard.tsx:7` `import { Icon } from '@iconify/react';`):

```tsx
import { Dot } from 'lucide-react';
```

Insert between `ProviderCard.tsx:454` (`)}` closing the open-status block) and `:455` (`{distanceLabel && (`):

```tsx
{openStatus.visible && distanceLabel && (
  <Dot
    className="h-icon-sm w-icon-sm text-text-muted"
    data-testid="provider-distance-separator"
  />
)}
```

Notes for the Implementer:

- `lucide-react` renders `Dot` with `aria-hidden="true"` by default, so no extra aria handling is needed (decorative separator).
- `h-icon-sm w-icon-sm` are CSS classes from the `spacing` tokens in `tailwind.config.ts` (20px). They override the SVG's default `width/height=24`, consistent with existing `w-4 h-4` usage on lucide icons elsewhere (`src/app/(public)/search/page.tsx:605`).
- Do not touch the surrounding spans or the `gap-2` row; the change is purely additive.

## Milestones

### M1 — TDD: add failing dot-conditional tests

**Owner:** Implementer
**Depends on:** nothing

Add three focused component tests to `src/__tests__/components/ProviderCard-distance.test.tsx` (natural home; already exercises `distanceKm`):

1. Dot renders when **both** open status and distance are present (pass `opening_hours` + `distanceKm`), and it sits inside the `provider-open-status` row between the status label and the `provider-distance` span (assert via `getByTestId('provider-distance-separator')` plus sibling order).
2. Dot is absent when distance is absent (pass `opening_hours` only) — `queryByTestId('provider-distance-separator')` is null.
3. Dot is absent when open status is absent (pass `distanceKm` only, no `opening_hours`) — `queryByTestId('provider-distance-separator')` is null.

Note: `mockProviders[0]` has no `opening_hours`, so the "both present" test must supply an `opening_hours` fixture inline (same 7-day `00:00-23:59` shape already used in `ProviderCard.test.tsx:440-448`).

**Acceptance:** all three tests exist and fail (`[pre-fix FAILS]` / red) before the source change.

### M2 — Implement the dot in ProviderCard

**Owner:** Implementer
**Depends on:** M1

Add the `lucide-react` `Dot` import and the guarded JSX block at the exact insertion point (see "Exact JSX Change").

**Acceptance:**
- M1 tests pass (green).
- Existing `ProviderCard-distance.test.tsx` (`getByText('1,2 km')`, `getByText('400 m')`, `queryByTestId('provider-distance')`) still pass.
- Existing `ProviderCard.test.tsx:437-481` (open-status presence/absence, `queryByText('●')` absent) still passes — the dot is an SVG, not a text `●`, so line 462 is unaffected.

### M3 — Regression sweep + static gates

**Owner:** Implementer
**Depends on:** M2

Confirm no collateral breakage and run static gates.

**Acceptance:**
- `HomeNearMeList.test.tsx` and `NearMeResultsGrid.test.tsx` still pass unchanged (both mock `ProviderCard`, so they never render the dot; no edits expected).
- `npm run type-check` and `npm run lint` clean.
- No file outside the two listed below is modified.

### M4 — Version confirmation + handoff

**Owner:** Implementer (verify), DevOps (release)
**Depends on:** M3

Confirm `package.json` version is `0.15.18` on the branch base (it is; Plan 217 merged). Do not bump. Record handoff notes.

**Acceptance:** plan changelog updated; no version change; handoff notes below complete.

## Milestone Dependencies

Not applicable — this is a single-layer, UI-only change (one source file + its test file). No backend/UI cross-dependency graph needed.

## File-by-File List

| File | Change |
|------|--------|
| `src/components/providers/ProviderCard.tsx` | Add `import { Dot } from 'lucide-react';` + guarded `<Dot>` JSX between lines 454-455 |
| `src/__tests__/components/ProviderCard-distance.test.tsx` | Add 3 dot-conditional tests (M1) |

Expected touched files: 2. No changes to `HomeNearMeList.test.tsx` or `NearMeResultsGrid.test.tsx` (they mock the card); update only if a test unexpectedly breaks.

## Out of Scope

- `HomeListView` (no distance → no dot; nothing to change).
- Converting existing `@iconify/react` icons in `ProviderCard` (bookmark heart, halal stars, moderation check/close) to Lucide.
- Any design-system token changes (reuse existing `icon-sm`, `text-text-muted`).
- Prop gating / new `ProviderCard` props.
- Version bump (see Version Pre-Flight).

## Testing Strategy (high level — QA owns formal cases)

- **Component tests (Vitest + React Testing Library):** the three conditional-render states in M1, plus the existing distance/open-status assertions as regression.
- **Regression:** existing `ProviderCard`, `ProviderCard-distance`, `HomeNearMeList`, and `NearMeResultsGrid` suites stay green.
- **Static:** `npm run type-check` + `npm run lint`.
- **Visual (UAT):** confirm the dot reads as a visible separator at the chosen `icon-sm` size and does not render alone on cards with only one field.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Lucide `Dot` too small/subtle at 20px | Contingency in Decision 3: escalate to `icon-md` as a one-line change; visual gate in UAT |
| New SVG disturbs existing testid queries | Dot is a sibling, not inside the queried spans; `provider-distance`/`provider-open-status` queries remain valid (F9 from analysis) |
| Mixed import (iconify + lucide) in one file | Acknowledged and scoped (Decision 2); both libraries already coexist elsewhere in the codebase |

## Duration Estimates

| Phase | Estimate |
|-------|----------|
| M1 (TDD red) | 0.5-1h |
| M2 (implement, green) | 0.25-0.5h |
| M3 (regression + gates) | 0.5h |
| M4 (version/handoff) | 0.25h |
| **Total** | **~0.5-1 day** |

Uncertainty drivers: none material beyond the visual size check (Decision 3 contingency). This is a two-file, <15-line change.

## Rollback Considerations

- Revert is a clean `git revert` of the single `ProviderCard.tsx` diff (plus test file); no schema, migration, or data change.
- No runtime/API impact; purely presentational.

## Handoff Notes

- No version bump (origin/main already `0.15.18`).
- Branch already exists: `feature/218-near-me-list-dot-separator` (per orchestrator).
- Do not convert existing iconify icons; the mixed-import situation is intentional and documented in Decision 1-2.
- Architect review verdict must be APPROVED before Implementer proceeds.

## Analysts Consulted

None beyond the inherited analysis `agent-output/analysis/218-dot-separator-analysis.md` (all L1 gaps G1-G3 resolved in the Decision Record above).
