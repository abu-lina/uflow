---
ID: 156
Origin: 156
UUID: b4e91f3c
Status: Active
---

# Milestone 1 — Auto-Apply Mode for Enrichment Pipeline

## Summary

Added `--mode auto-apply` to `scripts/enrich-providers.ts`. When in auto-apply mode, the Wolt enrichment path writes directly to the database (bypassing the `enrichment_candidates` staging step) but only for fields where the current value is null/empty and the proposed value is non-null/non-empty (additive-only via `detectConflict()`).

An architect-reviewed feature: `buildAutoApplyPayload()` handles empty strings per MEDIUM-1 recommendation, maps `no_alcohol`/`no_pork`/`no_gambling` to the `food_providers` sub-object, and separates `delivery_links`/`menu_items` for direct INSERT (bypassing the RPC's destructive DELETE+INSERT pattern).

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/enrichment/auto-apply-payload.ts` | **NEW** | `buildAutoApplyPayload()` — filters candidates to additive-only changes, builds `admin_update_provider` RPC payload, separates delivery_links/menu_items |
| `src/lib/enrichment/__tests__/auto-apply-payload.test.ts` | **NEW** | 15 unit tests covering additive, no-change, conflict, empty-string handling (MEDIUM-1), field routing, mixed candidates |
| `scripts/enrich-providers.ts` | MODIFIED | Added `--mode dry-run\|write\|auto-apply` CLI flag, `autoApplyWoltFields()` helper, updated `RunStats` with auto-applied tracking, backward-compatible `--write` support |

## TDD Compliance

| Test | Status | Notes |
|------|--------|-------|
| Additive: current=null, proposed=value → included | ✅ | `test.ts:24` |
| No-change: current=value, proposed=same value → excluded | ✅ | `test.ts:40` |
| Conflict: current=value_A, proposed=value_B → excluded | ✅ | `test.ts:53` |
| Empty string handling (MEDIUM-1): current='', proposed=value → included | ✅ | `test.ts:66` |
| Empty string skip (MEDIUM-1): current='', proposed='' → excluded | ✅ | `test.ts:92` |
| Empty string skip (MEDIUM-1): current=null, proposed='' → excluded | ✅ | `test.ts:79` |
| Delivery links extracted to separate array | ✅ | `test.ts:135` |
| Menu items extracted to separate array | ✅ | `test.ts:152` |
| RPC payload structure is valid (providers + food_providers) | ✅ | `test.ts:236` |
| no_alcohol routed to food_providers sub-object | ✅ | `test.ts:105` |
| no_pork/no_gambling routed to food_providers sub-object | ✅ | `test.ts:218` |
| Mixed candidates: additive + conflict + no-change | ✅ | `test.ts:167` |
| Empty proposed array returns empty payload | ✅ | `test.ts:191` |
| Null proposed_value excluded | ✅ | `test.ts:206` |

## Test Evidence

```
✓ src/lib/enrichment/__tests__/auto-apply-payload.test.ts (15 tests) 4ms

Test Files  1 passed (1)
     Tests  15 passed (15)
```

## Verification

- `npx tsc --noEmit` passes with zero errors
- `npx vitest run src/lib/enrichment/__tests__/auto-apply-payload.test.ts` — 15/15 passed
- `npx vitest run src/__tests__/services/admin/providerEdit.test.ts` — 18/18 passed (regression, no breakage)
- `npx tsx scripts/enrich-providers.ts` — runs without startup errors

## Known Limitations

1. **`offers_ids` not writable via RPC**: The `admin_update_provider` RPC doesn't handle `offers_ids`. If included in the payload, it's silently ignored. JoinHalal auto-apply will need a separate update path when implemented.
2. **`food_providers` INSERT defaults**: When `food_providers` sub-object is included, the RPC's INSERT branch sets defaults for all fields (e.g., `no_pork=false`, `no_gambling=false`). A pre-existing row uses `ON CONFLICT DO UPDATE` with `COALESCE` which preserves existing values, so this only affects providers without a `food_providers` row. Acceptable for M1.
3. **`auto_applied_fields` column**: `enrichment_run_logs` doesn't yet have an `auto_applied_fields` column (planned for M6). The run log insert doesn't include it. Console output tracks auto-applied fields instead.
4. **Auto-apply is Wolt-only**: JoinHalal source with `--mode auto-apply` exits with an error message.
