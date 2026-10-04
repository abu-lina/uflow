---
ID: 148
Origin: 148
UUID: 6507aea1
Status: Active
---

# Code Review: Plan 148 — Fix NOT NULL violation in admin_update_provider RPC

**Date**: 2026-06-05
**Reviewer**: Code Reviewer

## Summary
Clean, minimal fix. Two lines changed in the RPC function, zero functional side effects.

## Findings

| # | Check | Finding |
|---|-------|---------|
| 1 | **Correctness** | ✅ `COALESCE(NULLIF(v->>'verification_method', ''), 'online')` correctly defaults to `'online'` when the key is absent. Matches the column's `DEFAULT 'online'`. |
| 2 | **Scope** | ✅ Both `food_providers` and `store_providers` INSERT blocks fixed. |
| 3 | **ON CONFLICT UPDATE** | ✅ Already correct — uses `COALESCE(NULLIF(EXCLUDED.verification_method, ''), store_providers.verification_method)` which falls back to existing value. No change needed. |
| 4 | **Pattern consistency** | ✅ `has_certificate` already uses `COALESCE((...)::boolean, false)` — same pattern. |
| 5 | **Regression risk** | ✅ None — existing behavior unchanged when key IS present. |
| 6 | **Diff accuracy** | ✅ Only 2 lines changed, verified by diff against migration 094. |

## Verdict

**APPROVED** — No issues.
