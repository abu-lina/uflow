---
ID: 148
Origin: 148
UUID: 6507aea1
Status: Active
---

# QA Report: Plan 148 — Fix NOT NULL violation in admin_update_provider RPC

**Date**: 2026-06-05
**Reviewer**: QA

## Scope
Database function fix — `CREATE OR REPLACE FUNCTION` with two lines changed.

## Validation

| Check | Result | Notes |
|-------|--------|-------|
| SQL syntax | ✅ PASS | Valid PostgreSQL, checked by `CREATE OR REPLACE FUNCTION` |
| Diff accuracy | ✅ PASS | Only 2 lines differ from migration 094 |
| Logic correctness | ✅ PASS | `COALESCE(NULLIF(...), 'online')` matches column DEFAULT |
| Code review | ✅ PASS | All findings clean, verdict APPROVED |
| Schema impact | ✅ NONE | No DDL changes, no data migration |

## Verdict

**QA COMPLETE** — Fix is correct and minimal.

## Recommended Test (on UAT)
1. Find a provider without a `store_providers` or `food_providers` extension row
2. Edit it via the admin dashboard, changing only a non-extension field (e.g., `providerName`)
3. Previously would 500 — now should succeed
4. Also test: edit a provider changing `listing_type` between `food` and `store`
5. Also test: edit a provider with explicit `verificationMethod` change — should still work
