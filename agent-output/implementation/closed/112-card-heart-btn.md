---
ID: 112
Origin: 112
UUID: a1b2c3d4
Status: Committed
---

# 112 Card Heart Button

## Plan Reference
- Session: S112-card-heart-btn
- Task source: user handoff in session context (no matching `agent-output/planning/112-*.md` artifact was present in this worktree)

## Date
- 2026-04-28

## Changelog
| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-04-28 | @Implementer | Move ProviderCard bookmark control to top-right image overlay | Implemented top-right circular heart overlay in bookmark mode, removed bottom bookmark/website row, updated regression tests |
| 2026-04-28 | @Implementer | Apply PO decision on Barik display | Removed full Allahuma Barik rendering from overlay flow, added regression test, normalized UUID format |

## Implementation Summary
Moved the bookmark action UI in `ProviderCard` from the bottom action row to an absolute top-right overlay inside the image container (`top-3 right-3`), while preserving existing bookmark logic (optimistic update flow, pressed/hover states, Barik transition visibility, and saved fill animation). In bookmark mode, the bottom Save/Saved and Website actions are removed. Moderation mode (Approve/Reject + review badge) remains unchanged.

This delivers the task value by matching the requested Figma-inspired interaction hierarchy: primary bookmark affordance is now image-overlay first, with cleaner card actions in bookmark mode.

PO decision applied: full Allahuma Barik text animation is intentionally not rendered in the top-right overlay flow.

## Baseline & Measurements
- N/A (no performance baseline target in task scope)

## Milestones Completed
- [x] Loaded required skills (`react-best-practices`, `react-ui-patterns`) and workspace instruction set
- [x] Added failing regression test for bookmark-mode contract (overlay button present, bottom row hidden)
- [x] Implemented ProviderCard bookmark overlay relocation
- [x] Updated tests to match new bookmark-mode UX contract
- [x] Ran targeted test suite, lint, type-check, and build gate checks

## Files Modified
| Path | Changes | Lines |
| --- | --- | --- |
| `src/components/providers/ProviderCard.tsx` | Added top-right circular bookmark overlay button in image container, preserved animation logic, removed bookmark-mode bottom action row and Website button row | ~+88 / -211 |
| `src/__tests__/components/ProviderCard.test.tsx` | Added/updated regression assertions for overlay behavior and removed Website expectations in bookmark mode | ~+26 / -24 |

## Files Created
| Path | Purpose |
| --- | --- |
| `agent-output/implementation/112-card-heart-btn.md` | Implementation evidence and TDD compliance |

## Deployment Path Audit
- N/A — no deployment surface files touched (`Dockerfile`, workflows, deploy scripts unchanged)

## Code Quality Validation
- [x] Targeted tests pass: `npx vitest run src/__tests__/components/ProviderCard.test.tsx`
- [x] Type check passes: `npm run type-check`
- [x] Lint passes with warnings only: `npm run lint` (0 errors, pre-existing warnings across unrelated files)
- [ ] Production build full pass: `npm run build` blocked by missing `NEXT_PUBLIC_SUPABASE_URL` env var in local environment

## Value Statement Validation
- Original request: move heart/bookmark to top-right image overlay and remove bottom Save/Saved + Website row in bookmark mode while keeping moderation mode intact.
- Implemented result: bookmark control is now an absolute overlay at image top-right with circular icon behavior; bottom bookmark-mode action row removed; moderation mode rendering path unchanged.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| ProviderCard bookmark-mode UI contract (overlay heart + no bottom row) | `src/__tests__/components/ProviderCard.test.tsx` | ✅ Yes | ✅ Yes | `Unable to find an accessible element with role "button" and name /^save$/i` (pre-fix lacked overlay button role/name and still showed bottom row) | ✅ Yes |

## Test Coverage
- Unit/component regression coverage updated in `ProviderCard` test suite for:
  - bookmark overlay role/label behavior
  - absence of bottom Website action in bookmark mode
  - first-save flow does not render full Allahuma Barik text in overlay mode
  - unchanged moderation mode behavior

## Test Execution Results
- `npx vitest run src/__tests__/components/ProviderCard.test.tsx` -> PASS (37/37)
- `npm run type-check` -> PASS
- `npm run lint` -> PASS with warnings (no errors)
- `npm run build` -> FAIL due to missing local env var `NEXT_PUBLIC_SUPABASE_URL` (environment/config issue, not code compile error in touched files)

## Additional Mandatory Checks
- Search/Filter Client-Interaction Trace: N/A — no search submit handler or list filter URL lifecycle changes
- Multi-Plan State Audit: N/A — no prior-plan state semantic extension in same flow beyond visual control placement
- API Route Coverage Gate: N/A — no API route touched
- Local verification: ⚠️ Blocked — browser/manual visual verification not executed in this run
- Post-UAT Delta Review: N/A

## Outstanding Items
- Local browser verification on target page still required (visual alignment vs Figma on desktop/mobile)
- Full production build remains blocked locally by missing Supabase env vars
- No matching planning artifact (`112-*.md`) found in current worktree; implementation executed from session handoff scope

## Next Steps
1. Code Reviewer: verify UI placement fidelity and animation behavior against Figma reference and target route.
2. QA: run visual regression and interaction checks on UAT providers page.
3. If needed, provide local env vars and re-run `npm run build` for a complete green gate.
