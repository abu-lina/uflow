---
ID: 051
Origin: 051
UUID: d7f2b8e3
Status: Active
---

# Open Actions 051: Deferred Post-Deploy Follow-ups

## Summary

These follow-ups are intentionally deferred because they are non-blocking to release and do not change the core value delivery of Plan 051. They remain visible after the plan lifecycle documents are moved to `closed/`.

Release/version context: v0.8.11 (Plan 051 — JoinHalal Speisen Offers Mapping)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Add `unmappedOffers` display section to `ImportDryRunPageContent.tsx` parallel to existing unmapped-categories rendering | Product/Implementer | After first production import run with Plan 051; within 2 sprint cycles | PR showing UI rendering for non-empty `result.unmappedOffers` | Open |
| DF-2: Add direct CLI execution coverage for `scripts/import-joinhalal.ts` write path | QA/Implementer | Next import-pipeline test coverage pass | Automated test exercising `transformPageToProvider()` or equivalent CLI write-path contract | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-22T16:21Z | devops | Created tracker from UAT deferred follow-ups before Stage 1 closure |