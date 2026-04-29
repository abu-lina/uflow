---
ID: 115
Origin: 115
UUID: b7e3a91f
Status: Active
---

# Implementation 115 — Provider Card Specialties + Open Status

## Plan Reference

- Plan: `agent-output/planning/115-provider-card-specialties-open-status.md`
- Critique: `agent-output/critiques/115-provider-card-specialties-open-status-critique.md` (APPROVED)
- Classification: Feature
- Value statement: show what a provider is known for (specialties) and whether it is open, directly on discovery cards.

## Date

- 2026-04-29

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-04-29T23:06Z | User -> Implementer | Begin implementation for Plan 115 | Started TDD cycle and updated plan status to In Progress |
| 2026-04-29T23:12Z | Implementer | TDD RED | Added failing regression tests for `SearchResultsList` pass-through and `ProviderCard` open-status marker |
| 2026-04-29T23:15Z | Implementer | TDD GREEN | Wired `offers` + `opening_hours` to card and implemented specialty/open-status rendering |
| 2026-04-29T23:40Z | Implementer | Quality gates | Ran full tests, type-check, build; fixed lint blocking by excluding third-party reference snapshot path |

## Implementation Summary

Implemented both planned user-facing enhancements on discovery cards:

1. **Specialty tags**: Cards now render up to 2 offer names from provider `offers` with `+N` overflow (for example `Shawarma · Falafel · +1`).
2. **Open/closed indicator**: Cards now render a compact localized open-status marker (green/red dot + text) when `opening_hours` exists.

Data flow was completed end-to-end by wiring `opening_hours` into `SearchResult` and ensuring `SearchResultsList` passes both `offers` and `opening_hours` into `ProviderCard`.

This directly delivers the plan value: users can decide faster from the card surface without opening detail pages.

## Baseline & Measurements

- Baseline/perf measurements: N/A for this feature.
- Reason: no query-path, rendering-strategy, or bundle-architecture change; only additional conditional card rows and existing utility reuse.

## Milestones Completed

- [x] M1 Wire offers/opening_hours through the data pipeline
- [x] M2 Render specialty tags on cards
- [x] M3 Render compact open/closed indicator on cards
- [x] M4 Version/changelog artifact updates

## Files Modified

| Path | Changes | Approx. lines |
| --- | --- | --- |
| `src/services/providers.ts` | Added `opening_hours` to `SearchResult`; passed through in provider transform; set null in community service transform | +3 |
| `src/components/providers/SearchResultsList.tsx` | Passed `offers` and `opening_hours` through `searchResultToProvider()` | +2 |
| `src/components/providers/ProviderCard.tsx` | Added specialties row rendering and compact open-status rendering via `getOpenStatus` | +30 |
| `src/__tests__/components/ProviderCard.test.tsx` | Added Plan 115 regression tests for specialties and open-status marker | +58 |
| `src/__tests__/components/providers/search-results-list-scroll-render.test.tsx` | Added pass-through regression test for `offers` + `opening_hours` to `ProviderCard` | +48 |
| `eslint.config.mjs` | Ignored `docs/references/**` third-party snapshot bundle to unblock lint gate | +1 |
| `CHANGELOG.md` | Added Plan 115 release notes under `0.11.4` | +5 |
| `agent-output/planning/115-provider-card-specialties-open-status.md` | Set `Status: In Progress` and added implementation-start changelog line | +2 |

## Files Created

| Path | Purpose |
| --- | --- |
| `agent-output/implementation/115-provider-card-specialties-open-status-implementation.md` | Plan 115 implementation record and gate evidence |

## Deployment Path Audit

- N/A — no deployment surface modified (`Dockerfile`, workflows, deploy scripts, infra configs unchanged).

## Schema Verification Gate (DB Migrations)

- N/A — no migration added or modified.

## DB Plan Evidence Gate (Search)

- N/A — no new search indexes/RPCs/query plans added.

## Local Verification Gate

- Local verification: ⚠️ Blocked.
- Blocker: No interactive browser/UAT runtime session executed in this terminal-only run. Functional behavior validated through component + list integration tests.

## Interaction-Layer Audit Checklist

- N/A — no pointer-events/overlay/hit-testing changes introduced.

## Search/Filter Client-Interaction Trace

- N/A — no submit handlers, URL builders, or result-list inline action guards were modified.

## Multi-Plan State Audit

- N/A — no new `useEffect`/hydration/localStorage precedence semantics introduced in search/page state.

## API Route Coverage Gate

- N/A — no `src/app/api/**/route.ts` changes.

## Code Quality Validation

- [x] `npx vitest run` -> pass (`143 passed`, `1 skipped`; `1175 passed`, `18 skipped`)
- [x] `npm run lint` -> pass (`0 errors`, warnings only)
- [x] `npm run type-check` -> pass
- [x] `npm run build` -> pass
- [x] Targeted Plan 115 tests -> pass (`48/48`)

## Value Statement Validation

- Original value: users can decide restaurant fit directly from cards via specialty + open state.
- Delivery evidence:
  - Specialty terms are visible on card without opening detail modal/page.
  - Open/closed status is visible on card where schedule data exists.
  - Cards without data degrade gracefully (no blank status text/no crash).

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `SearchResultsList.searchResultToProvider()` pass-through (`offers`, `opening_hours`) | `src/__tests__/components/providers/search-results-list-scroll-render.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: `offers` was `undefined` in `ProviderCard` props | ✅ Yes |
| `ProviderCard` specialties rendering (top-2 + overflow) | `src/__tests__/components/ProviderCard.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: specialties text row missing | ✅ Yes |
| `ProviderCard` compact open-status marker | `src/__tests__/components/ProviderCard.test.tsx` | ✅ Yes | ✅ Yes | AssertionError: `data-testid=provider-open-status` missing | ✅ Yes |

## Test Coverage

- Unit/component:
  - Specialty string rendering and overflow counter on card
  - Open-status marker visibility when opening hours exist
- Integration:
  - Search result to card props mapping now includes `offers` and `opening_hours`

## Test Execution Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx vitest run src/__tests__/components/ProviderCard.test.tsx src/__tests__/components/providers/search-results-list-scroll-render.test.tsx` | ✅ Pass | `48 passed` |
| `npx vitest run` | ✅ Pass | `143 files passed`, `1 skipped`; `1175 tests passed`, `18 skipped` |
| `npm run lint` | ✅ Pass | `0 errors`, warnings only; third-party snapshot path now ignored |
| `npm run type-check` | ✅ Pass | no TS errors |
| `npm run build` | ✅ Pass | production build completed |

## Outstanding Items

1. `npm run lint` still reports existing repository warnings (no errors) in test files and one hook dependency warning outside Plan 115 scope.
2. Local browser verification remains blocked in this run; QA/UAT should validate visual spacing on representative mobile devices.

## Next Steps

1. Code Review gate for Plan 115 implementation.
2. QA regression run (card render states: no offers, 1 offer, 3+ offers, opening hours absent/present).
3. UAT visual validation on mobile card layout and i18n labels.
