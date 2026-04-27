---
ID: 107
Origin: 107
UUID: a3f2c8b1
Status: Committed
---

# Open Actions 107: Deferred Post-Deploy Follow-ups

## Summary

Plan 107 (Ummah Tab Section-Conditional Search, v0.10.31) delivers the search-intent UI layer only. Three items were explicitly deferred to post-release follow-up work: providers wiring for end-to-end Ummah results (F1 from critique), non-German translation quality (design decision D8 — placeholders acceptable for MVP), and mobile responsiveness live validation (functional completeness, not a code defect).

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
|---|---|---|---|---|
| DF-1: Ummah provider results wiring | Architecture / Implementer | Next sprint after v0.10.31 | `SEARCH_FILTER_KEY_SET` updated to include Ummah keys; `/providers` page executes Ummah-specific provider search; E2E test: Ummah query → relevant provider results | Open |
| DF-2: Non-German translation quality | Localization / Product | EOQ 2026 | Native speaker review for en/tr/ur/ps/ar Ummah service-type and filter labels; quality translations deployed; UAT sign-off from locale stakeholder | Open |
| DF-3: Mobile responsiveness validation | QA or Product | Post v0.10.31 release (first live user session) | iOS 14+ and Android 10+ validated: section switching smooth, filter toggles respond on touch, no layout shifts, no scroll jank | Open |

## Background

- **DF-1 (providers wiring)**: Code review found Ummah filters sent to `/providers` URL params but dropped by `SEARCH_FILTER_KEY_SET` allowlist validation at providers receiver. Risk accepted as plan-scoped. This is the highest-priority follow-up.
- **DF-2 (translation quality)**: All 6 locale files have key parity (de, en, tr, ur, ps, ar). German is authoritative. Non-German entries were added as part of MVP with placeholder-quality translations. Quality improvement is non-blocking for release.
- **DF-3 (mobile)**: Implementation uses existing responsive patterns (WasServiceTypeResults mirrors WasCategoryResults layout; UmmahFilterSection mirrors FilterSection layout). No specific mobile tests were added for Plan 107. Live validation is recommended before broad user rollout.

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-27T09:55Z | devops | Created tracker from UAT deferred validations (DF-1, DF-2, DF-3) |
| 2026-04-27T15:40Z | code-reviewer | Code review approved for latest Plan 107 implementation deltas; ready for QA execution |
| 2026-04-27T16:02Z | qa | QA Complete: all 12 test scenarios pass; 1130/1130 full suite pass; type-check clean; ready for UAT |
| 2026-04-27T16:05Z | uat | UAT Approved: value statement delivered; all user-facing scenarios pass; zero regressions in food path. Ready for DevOps release execution. |

