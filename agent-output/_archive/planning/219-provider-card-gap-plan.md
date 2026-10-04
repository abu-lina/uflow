---
ID: 219
Origin: 219
UUID: 881ebb4e
Status: Committed
---

# Plan 219 — Tighten gap between open/closed status, dot separator, and distance badge on ProviderCard

| Field | Value |
|---|---|
| Plan ID | 219 |
| Target Release | v0.15.18 |
| Epic Alignment | Near-me search UX (extends Plan 196 distance badge + Plan 217 home near-me list + Plan 218 dot separator) |
| Status | Code Review Approved |
| Related Issues | None |
| Branch | refactor/219-provider-card-gap |

## Changelog

| Date | Agent | Action |
|---|---|---|
| 2026-08-17 | Planner | Opened plan. Scope confirmed to single `gap-2` → `gap-1` token change on `ProviderCard` status row. |
| 2026-08-24 | Code Reviewer | Code review approved. Implementation matches plan; no findings. |
| 2026-08-24 | QA | QA Complete. 59/59 tests pass, type-check + lint clean, APPROVED FOR RELEASE (UAT-219-1 device check pending in combined v0.15.18 pass). |
| 2026-08-24 | DevOps | Document closed | Status: Committed |

## Value Statement

As a UFlow user browsing provider cards in the near-me results, I want the open/closed status label, the dot separator, and the distance badge to sit closer together, so that the status row reads as one cohesive unit instead of three loosely spaced fragments.

## Objective

Reduce the flex gap token on the shared `ProviderCard` `provider-open-status` row from `gap-2` (8px) to `gap-1` (4px). The row renders the open/closed status label, the Plan 218 dot separator, and the Plan 196 distance badge. Because the change lives in the shared card, both the home near-me List view and search-page near-me results inherit it automatically. The footer actions row `gap-2` at `ProviderCard.tsx:567` remains untouched.

## Context

- `src/components/providers/ProviderCard.tsx:448` renders the status/distance row with `className="mt-0.5 flex items-center gap-2"`.
- Plan 218 inserted the `Dot` separator between the status label and the distance badge in the same row.
- Plan 196 added the distance badge.
- The footer actions row at `ProviderCard.tsx:567` uses its own independent `gap-2` and is out of scope.

## Decision Record

1. **[RESOLVED] Scope: only the status row `gap-*` token.** Rationale: the requested spacing change is specific to the status/dot/distance group; the footer action buttons are a separate visual group and should keep their existing spacing.

2. **[RESOLVED] Use a single-token Tailwind change (`gap-2` → `gap-1`).** Rationale: minimal, reversible, no new props or design tokens.

## File-by-File List

| File | Change |
|---|---|
| `src/components/providers/ProviderCard.tsx` | Change status-row `gap-2` to `gap-1` at line 448 |
| `src/__tests__/components/ProviderCard-distance.test.tsx` | Add `toHaveClass('gap-1')` / `not.toHaveClass('gap-2')` assertions in the Plan 218 dot-separator block |

## Testing Strategy

- **Component test (Vitest + React Testing Library):** assert the `provider-open-status` row has `gap-1` and not `gap-2` when both status and distance are present.
- **Regression:** existing `ProviderCard`, `ProviderCard-distance`, `HomeNearMeList`, Plan 217, and Plan 212 suites stay green.
- **Static:** `npm run type-check` + `npx eslint` on changed files.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Visual regression on untested viewports | UAT device check `UAT-219-1` per critique F-219-2 |

## Rollback Considerations

- Revert is a clean single-token revert of `ProviderCard.tsx`; no schema or API change.
