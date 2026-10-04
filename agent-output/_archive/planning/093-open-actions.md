---
ID: 093
Origin: 093
UUID: b5e2a8c4
Status: Active
---

# Open Actions 093: Deferred Post-Deploy Follow-ups

## Summary

Plan 093 (City Interest: Notify Me) was released as v0.10.20. Two low-risk residuals were identified in UAT and deferred to post-release monitoring. These items do not block the release but require follow-up after production deployment.

Release/version context: v0.10.20 (patch bump, 2026-04-19)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| **R1: Email notification delivery** — Plan 093 captures interest data but does not send confirmation emails to registrants (email sending deferred to future plan per D4 of critique) | DevOps / Product | User complaint or delivery request | Email service integration + notification scheduler plan created and deployed | Open |
| **R2: Production load scaling monitoring** — `checkCityExists()` targeted lookup not load-tested at production volumes; QA cannot simulate prod traffic | DevOps | Monitor search API metrics post-release; if P95 latency > 500ms, implement caching | Verify P95 query latency < 500ms on Day 1 of production via search API metrics dashboard | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-19T21:00Z | devops | Created tracker from UAT residuals R1 and R2 (UAT doc section "Low-Risk Residuals") |
