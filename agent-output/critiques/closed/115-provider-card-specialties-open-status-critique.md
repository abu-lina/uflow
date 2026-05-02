---
ID: 115
Origin: 115
UUID: b7e3a91f
Status: Resolved
---

# Critique — Plan 115: Provider Card Specialty Tags + Open/Closed Status

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Artifact       | `agent-output/planning/115-provider-card-specialties-open-status.md`  |
| Analysis       | `agent-output/analysis/closed/115-provider-card-specialties-analysis.md` |
| Date           | 2026-04-29T18:30Z                                                     |
| Status         | Initial                                                               |

## Changelog

| Date             | Handoff | Request                    | Summary                         |
|------------------|---------|----------------------------|---------------------------------|
| 2026-04-29T18:30Z | User   | Plan review for approval   | Initial critique — APPROVED     |

---

## Value Statement Assessment

**Present**: Yes — clear user story format with "As a / I want to / So that".
**Clarity**: Strong. "Quickly decide which restaurant to visit" is verifiable through user behavior.
**Alignment**: Direct alignment with the Master Product Objective ("makes halal businesses easily discoverable"). Surfacing dish specialties improves discoverability without requiring search.
**Directness**: Value is delivered immediately upon deployment — no deferred dependencies.
**User Evidence**: Includes real user feedback quote ("vielleicht noch einbauen für was die bekannt sind, also Shawarma usw") — excellent requirement provenance.

**Verdict**: PASS ✓

---

## Overview

Lean, well-scoped plan that wires two existing data fields (`offers`, `opening_hours`) through an already-functional data pipeline to the `ProviderCard` render surface. No DB migrations, no new APIs, no new external services. This is a pure UI enhancement leveraging existing infrastructure — the ideal type of feature delivery.

The two features are complementary (answer "what do they serve?" and "can I go now?") and share a common implementation prerequisite (M1 data pipeline wiring), making bundling them in one release efficient.

---

## Architectural Alignment

**Postgres-first**: No new DB changes. Reuses existing `select('*')` data. ✓
**Server/Client separation**: `getOpenStatus()` runs client-side (pure function, no network call). Offers data arrives server-side via the existing batch query. ✓
**Component patterns**: Conditional rendering with graceful empty states matches existing `badges` and `barakah_effects` patterns in `ProviderCard`. ✓
**No premature services**: No Redis, no external APIs, no new infrastructure. ✓

**Verdict**: PASS ✓

---

## Scope Assessment

Well-bounded: 4 milestones, each with clear acceptance criteria. M2 and M3 are independent after M1, enabling parallel implementation. M4 is standard release housekeeping.

The plan does NOT attempt to:
- Redesign the card layout broadly
- Add new database columns
- Create new API endpoints
- Handle the "providers without data" problem beyond graceful empty states

This restraint is appropriate.

---

## Technical Debt Risks

| Risk | Assessment |
|------|------------|
| `ProviderCard` growing larger (already complex) | LOW — adds 2 conditional render blocks; consistent with existing pattern. Could be refactored later if the component grows beyond ~600 lines |
| `SearchResultsList.searchResultToProvider()` is incomplete (drops data) | This plan partially fixes this debt by adding `offers` and `opening_hours`. Other fields may still be dropped — acceptable scope boundary |
| D6 applies features to all sections but food providers have the best data population | LOW — graceful empty states prevent visual regression for business/ummah sections with sparse data |

---

## Findings

| # | Severity | Issue Title | Status | Description | Impact | Recommendation |
|---|----------|-------------|--------|-------------|--------|----------------|
| F1 | LOW | M1.4 ExploreSection verification outcome undefined | OPEN | Task 4 says "Verify ExploreSection and ProvidersList call sites — if they use `getProviders()` (which doesn't fetch offers), add the offers batch-fetch **or accept graceful empty state**". The acceptance criteria for M1 does not commit to either path. | Implementer may skip the verification entirely or make inconsistent choices across call sites | Add acceptance criterion: "Document which code paths deliver empty `offers`/`opening_hours` (graceful degradation acceptable; no runtime errors)" |
| F2 | LOW | No i18n key specified for specialty tag separator | OPEN | M2 renders dot-separated text ("Shawarma · Falafel"). The `·` character and `+N` format are not localized. | Minor UX inconsistency for RTL languages (Arabic, Urdu, Pashto) where `+N` may read awkwardly | Acceptable for V1; note as deferred RTL polish if user feedback surfaces |
| F3 | LOW | D5 "name_de always" may show German dish names to Arabic/Turkish users | OPEN | Decision D5 locks to `name_de` for specialty tags. For some offers, `name_de` IS the universal name (e.g., "Shawarma", "Falafel"). But for others (e.g., "Schnitzel", "Bratwurst"), German-only names could confuse non-German speakers | Low likelihood for food providers (most dish names are universal); medium for business section | Acceptable for V1 given German-first market. Add to open-actions if user feedback indicates confusion |

---

## Unresolved Open Questions

None. The plan has no `OPEN QUESTION` markers.

---

## Decision Record Check

All 7 decisions are marked `[RESOLVED]` with clear rationale. No `[OPEN]` or `[DEFERRED]` decisions.

**Verdict**: PASS ✓

---

## Duration Estimates Check

Present and reasonable:
- Implementation: 2–4 hours (appropriate for wiring + render work)
- QA: 1–2 hours
- UAT: 30 min
- DevOps: 30 min
- Total: 4–7 hours

**Verdict**: PASS ✓

---

## "How will this plan result in a hotfix after deployment?"

**Scenario 1**: `getOpenStatus()` returns `visible: true` but shows wrong state (e.g., restaurant shows "Open" when closed).
- **Mitigation already in plan**: Reuses proven utility from Plan 113 with existing test coverage including overnight carry-over edge cases. Risk is LOW.

**Scenario 2**: Providers with empty `offers_ids` show blank space or layout shift.
- **Mitigation already in plan**: Conditional rendering only when `offers.length > 0`. Risk is LOW.

**Scenario 3**: Performance regression from calling `getOpenStatus()` per card in a list of 50+ results.
- **Assessment**: Pure computation (<1ms per call). Even 100 calls = <100ms. No network IO. Risk is NEGLIGIBLE.

**Verdict**: No hotfix-likely scenarios identified.

---

## Risk Assessment

| Category | Rating | Notes |
|----------|--------|-------|
| Scope creep | LOW | Well-bounded, no DB changes |
| Architectural drift | NONE | Aligns perfectly with existing patterns |
| Hotfix risk | LOW | Graceful degradation, proven utilities |
| Technical debt | LOW | Marginal additions to existing component |

---

## Recommendations

1. **Implementer note**: When wiring M1, consider adding a code comment in `searchResultToProvider()` noting which Provider fields are intentionally NOT passed through (to prevent future regressions of the same "data exists but is dropped" pattern).
2. **QA note**: Test with a provider that has exactly 0, 1, 2, and 5+ offers to verify all truncation states.

---

## Verdict

**APPROVED** — Plan is clear, complete, well-scoped, and architecturally aligned. All findings are LOW severity and do not block implementation. Direct value delivery from proven existing data and utilities.

---

## Revision History

| Rev | Date | Findings Addressed | New Findings | Status Changes |
|-----|------|--------------------|--------------|----------------|
| Initial | 2026-04-29T18:30Z | — | F1, F2, F3 | — |
