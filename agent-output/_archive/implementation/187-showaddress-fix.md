# Plan 187 — showAddress localStorage Sync Fix

## Change Made

**File**: `src/components/providers/ProviderEditForm.tsx:279`

```
- showAddress: parsed.showAddress ?? prev.showAddress,
+ showAddress: parsed.showAddress || prev.showAddress,
```

`??` (nullish coalescing) only falls through for `null`/`undefined`. `false` is not nullish, so a stale `false` from localStorage permanently overrode the DB-sourced `true`. Changed to `||` so `false` falls through to `prev.showAddress` (the DB value).

## Edge Case Verification

| Expression | Result | Scenario |
|-----------|--------|----------|
| `false \|\| true` | `true` | Stale localStorage `false`, DB has `true` → DB wins |
| `false \|\| false` | `false` | User toggled online within session → preserved |
| `undefined \|\| true` | `true` | Key missing from localStorage → DB wins |

## Test Results

- **Test files**: 214 passed, 2 skipped (pre-existing)
- **Tests**: 1757 passed, 22 skipped (pre-existing)
- **Regressions**: None

## Observations

Straightforward single-character fix. All other fields in the same object already use `||` — line 279 was the only outlier using `??`, which was inconsistent with the pattern and specifically broken for `showAddress` since it's the only boolean field.
