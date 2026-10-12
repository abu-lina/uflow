# Code Review: #254 multi-category providers — Chunk B + Chunk A fixes

**Scope**: commit `1968e2a2` (33 files), read against the whole branch divergence `main...HEAD`
**Spec**: issue #254 comment 6084017153 (authoritative)
**Prior review**: issue #254 comment 6084751455 (REJECTED, 4 findings)
**Date**: 2026-10-10
**Reviewer**: Code Reviewer
**Verdict**: REJECTED (1 HIGH, 3 MEDIUM). The four prior findings are all closed.

Full findings, verification transcripts and severities are posted on issue #254.
This file exists only so the review has a durable on-disk artifact; the issue
comment is the canonical record.

## Verification environment

Local Supabase stack up for the whole review: Postgres `127.0.0.1:54322`,
PostgREST `127.0.0.1:54321/rest/v1`, migration 139 applied, 4 providers /
2 junction rows before and after (state restored).

## Prior findings

| #   | Severity | Status                                                                               | Evidence                                                                                                                                                     |
| --- | -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | CRITICAL | CLOSED                                                                               | 18 hinted embeds in 10 files, 0 unhinted in `src/`+`scripts/`+`tools/`+`e2e/`; 14 distinct shapes probed live, all 200; unhinted control reproduces PGRST201 |
| 2   | HIGH     | CLOSED                                                                               | live: no-op save preserves 4 rows, primary change resets to 1, NULL primary wipes to 0                                                                       |
| 3   | MEDIUM   | CLOSED                                                                               | migration applied twice against the live DB, no error, row counts unchanged                                                                                  |
| 4   | MEDIUM   | CLOSED as written, REOPENED as the new HIGH: the suite exists but is gated off in CI |

## New findings

- **HIGH** `src/__tests__/integration/postgrest-category-embed.test.ts:109` —
  `describe.skipIf(!LOCAL_STACK)` hides all 8 tests in CI.
- **MEDIUM** `ProviderEditForm.tsx:214-243` — a secondary draft written before a
  primary change survives it.
- **MEDIUM** `ProviderEditForm.tsx:625-631` — one `23514` message for three
  distinct constraint failures.
- **MEDIUM** `ProviderEditForm.tsx:563-588` — owner junction DELETE and INSERT
  are two separate transactions.
- LOW: `docs/ai/LEARNINGS.md:1349` says 13 call sites (actual 18); unrelated
  prettier churn in 5 service files; unused i18n key
  `editAdditionalCategories.selected`; "additional" vs glossary "Secondary".
