---
ID: 052
Origin: 052
UUID: 52c1b8af
Status: Released
---

# Implementation: Plan 052 — MuslimBusiness Provider Data Ingestion Pipeline

## Plan Reference

- **Plan**: `agent-output/planning/052-muslimbusiness-provider-data-ingestion-plan.md`
- **Critique**: `agent-output/critiques/052-muslimbusiness-provider-data-ingestion-critique.md`
- **Date**: 2026-03-23T14:01Z

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-23T14:01Z | Implementer | Initial implementation of Plan 052 | Parser (277 LOC), tests (552 LOC, 74 tests), import script (777 LOC). All quality gates pass. |

## Implementation Summary

Delivered a complete muslimbusiness.de provider data import pipeline mirroring the Plan 047 (joinhalal) architecture:

1. **Parser utility** (`src/utils/muslimbusiness-parser.ts`) — 7 pure exported functions that extract provider cards from raw HTML using `<h3>` boundary splitting, then normalize labeled fields (Standorte, Branchen, Email, Telefon, Social Media). Handles placeholder cleanup, promo text filtering, and social media format normalization.

2. **Parser tests** (`src/__tests__/utils/muslimbusiness-parser.test.ts`) — 74 unit and integration tests with 11 HTML fragment fixtures covering normal cards, placeholder values, promo text bleeding, Instagram/LinkedIn URL formats, missing fields, and multi-location scenarios.

3. **Import script** (`scripts/import-muslimbusiness.ts`) — CLI tool with `--dry-run` (default), `--write`, and `--limit N` modes. Fetches the single `/datenbank` page, parses all cards, maps 60+ Branchen values to 7 UFlow categories, deduplicates via `name|city` composite key, and batch-upserts into Supabase with service-role access.

This delivers the plan's value statement: admins can expand Germany-focused provider coverage quickly without manual entry by running a single CLI command.

## Critique Findings Addressed

| Finding | Severity | Resolution |
|---|---|---|
| **M-1**: Import-Bot UUID Strategy | MEDIUM | Created source-specific bot: UUID `00000000-0000-0000-0000-000052000001`, email `import-bot-muslimbusiness@system.internal`. Per-source provenance enabled. |
| **M-2**: Multi-Location Mapping | MEDIUM | Option (a)+(d): `extractPrimaryCity()` takes first non-virtual city (skips "Online", "Deutschlandweit"). Full location list visible in dry-run output. |
| **M-3**: External Logo URLs | MEDIUM | Option (a): Logo import skipped entirely. Avoids runtime dependency on third-party Supabase bucket. Documented as future enhancement. |
| **L-1**: Pagination | LOW | Verified: source renders all ~250+ cards on single page. No pagination needed. |
| **L-2**: Rate Limiting | LOW | Moot — single page fetch only. No rate limiting needed. |
| **L-3**: Missing Chatmode File | LOW | N/A — process improvement, not implementation scope. |

## Milestones Completed

- [x] **Milestone 1** — Source contract defined: single-page HTML with `<h3>` card boundaries, labeled fields
- [x] **Milestone 2** — Pure parser built with TDD: 7 functions, 74 tests, placeholder/promo cleanup
- [x] **Milestone 3** — Field mapping complete: 60+ Branchen → 7 UFlow categories, schema-safe fields only
- [x] **Milestone 4** — Dedup via `name|city` composite key, upsert semantics, import-bot provenance
- [x] **Milestone 5** — CLI import script with dry-run/write/limit modes, batch upsert, console reporting
- [ ] **Milestone 6** — Version bump + CHANGELOG deferred to DevOps Stage 1 (per plan: "only after DevOps confirms exact non-colliding release number")

## Files Created

| Path | Purpose | Lines |
|---|---|---|
| `src/utils/muslimbusiness-parser.ts` | Pure parser/normalization utilities | 277 |
| `src/__tests__/utils/muslimbusiness-parser.test.ts` | Unit + integration tests (74 tests) | 552 |
| `scripts/import-muslimbusiness.ts` | CLI import script | 777 |

## Files Modified

| Path | Changes | Lines Changed |
|---|---|---|
| `agent-output/planning/052-muslimbusiness-provider-data-ingestion-plan.md` | Status: "Planned" → "In Progress" | 1 |

## Code Quality Validation

- [x] **Compilation**: `npx tsc --noEmit` — 0 errors
- [x] **Linting**: `npx eslint` on parser + tests — 0 errors, 0 warnings (script ignored by eslint config, expected)
- [x] **Tests**: `npx vitest run` — 373 pass, 0 fail, 18 pre-existing skips (35 test files)
- [x] **Parser tests**: 74/74 pass
- [x] **No regressions**: All 299 pre-existing tests continue to pass

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `extractProviderCardsFromHtml()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `parseStandorte()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `parseBranchen()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `isPlaceholder()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `normalizeSocialMedia()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `normalizePhone()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |
| `extractPrimaryCity()` | `muslimbusiness-parser.test.ts` | ✅ Yes | ✅ Yes | Cannot find module | ✅ Yes |

## Value Statement Validation

**Original**: "As an admin/operator, I want to ingest public provider listings from muslimbusiness.de/datenbank into the existing UFlow providers dataset through a repeatable dry-run-capable import pipeline, so that UFlow can expand Germany-focused provider coverage quickly without manual entry and strengthen city/category discovery for Muslim users."

**Implementation delivers**:
- ✅ Ingests public provider listings from muslimbusiness.de/datenbank
- ✅ Repeatable: idempotent upsert with `name|city` composite key dedup
- ✅ Dry-run capable: `--dry-run` is the default mode
- ✅ Expands Germany-focused provider coverage: 60+ Branchen mapped to 7 UFlow categories
- ✅ No manual entry: single CLI command imports all ~250+ providers
- ✅ City/category discovery: providers mapped to real cities and existing categories

## Category Mapping Summary

60+ source Branchen labels mapped to 7 UFlow categories:

| UFlow Category | Example Source Branchen |
|---|---|
| Essen & Trinken | gastronomie, lebensmittelhandel, catering, bäckerei, metzgerei |
| Kleidung & Mode | bekleidung, textilien, schneiderei, schuhe, brautmode |
| Gesundheit & Sport | gesundheit, fitness, apotheke, coaching, physiotherapie |
| Dienstleistungen | beratung, immobilien, versicherung, marketing, fotografie |
| Handwerk & Reparatur | handwerk, kfz, elektrotechnik, reinigung, sanitär |
| Bildung & Lernen | bildung, nachhilfe, sprachschule, fahrschule |
| Sonstiges | sonstiges, bestattung, rechtsanwalt (catch-all) |

Unmapped Branchen values are reported in dry-run output and default to `null` category_id.

## Test Execution Results

```
Command: npx vitest run
Result: 373 passed | 18 skipped | 0 failed
Test Files: 35 passed | 1 skipped (36)

Parser-specific: 74/74 tests pass
  - extractProviderCardsFromHtml: 19 tests
  - parseStandorte: 9 tests
  - parseBranchen: 7 tests
  - isPlaceholder: 9 tests
  - normalizeSocialMedia: 12 tests
  - normalizePhone: 10 tests
  - extractPrimaryCity: 8 tests
```

## Architectural Decisions Made During Implementation

1. **HTML parsing over hydration JSON**: muslimbusiness.de renders all cards as server-side HTML with consistent `<h3>` + labeled-line structure. No `__NEXT_DATA__` hydration payload contained provider data. HTML parsing is the most stable approach.

2. **`name|city` composite key for dedup**: Matches provider identity at the business-location level. Avoids UUID collisions across reruns. Operators can audit matches in dry-run output.

3. **First-match category resolution**: When a provider has multiple Branchen, the first match in `BRANCHEN_CATEGORY_MAP` wins. Unmapped categories are reported but don't block import.

4. **Skip virtual locations**: `extractPrimaryCity()` skips "Online" and "Deutschlandweit" to avoid meaningless `address_city` values. Falls back to first city if all are virtual.

5. **No logo import**: External Supabase storage URLs create uncontrolled dependency. Skipped per critique M-3.

## Outstanding Items

| Item | Type | Notes |
|---|---|---|
| Version bump + CHANGELOG | Deferred | Per plan: wait for DevOps Stage 1 to confirm exact release number |
| Logo/image import | Future enhancement | Skipped per critique M-3; would require download + re-host |
| Hidden subcategory enrichment | Deferred (plan) | Per DEFERRED decision: requires confirmed hidden-taxonomy workflow |
| Operator documentation | Milestone 6 | Inline `--help` in script; formal docs deferred to release |

## Next Steps

→ Code Reviewer validates implementation against plan
→ QA validates test coverage, security, and quality
→ UAT validates operational dry-run behavior
→ DevOps confirms release number and deploys

---

✅ PHASE COMPLETE: ⑤ Implementer
📄 Output: agent-output/implementation/052-muslimbusiness-provider-data-ingestion-implementation.md
➡️ NEXT: Pick "⑥ Code Reviewer" from the Orchestrator handoff suggestions
   Gate: Review verdict must be APPROVED or APPROVED_WITH_COMMENTS
