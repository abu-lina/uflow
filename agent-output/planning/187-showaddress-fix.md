---
ID: 187
Origin: 187
UUID: b7f3d8a2
Status: Active
---

# Plan: Fix showAddress localStorage Sync Bug

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | Planner | Plan created from analysis 187 |

## Summary

Change `??` to `||` for `showAddress` in `syncFromLocalStorage` so DB-provided `true` is not permanently overridden by stale `false` from localStorage.

## Root Cause

Line 279 of `ProviderEditForm.tsx`:
```typescript
showAddress: parsed.showAddress ?? prev.showAddress,
```

`??` preserves `false` from localStorage even when `prev.showAddress` is `true` (from the DB record). Once `showAddress: false` enters localStorage (e.g., toggling "Online Business" ON in any session), it permanently overrides the DB value on every subsequent form load. Saving then writes `show_address = false` to the DB, causing overview pages to display "Online" instead of the physical address.

## Changes

### Change 1: Fix operator in syncFromLocalStorage

**File**: `src/components/providers/ProviderEditForm.tsx`
**Line**: 279

**Current code**:
```typescript
showAddress: parsed.showAddress ?? prev.showAddress,
```

**New code**:
```typescript
showAddress: parsed.showAddress || prev.showAddress,
```

### Change 2 (already deployed): Guard against contradictory isOnlineBusiness in syncFromLocalStorage

**File**: `src/components/providers/ProviderEditForm.tsx`
**Lines**: 287-289

This guard was added by Plan 174 and correctly resets `isOnlineBusiness` when address data contradicts it. The `showAddress` fix completes the remaining gap.

## Edge Cases Covered

| Expression | Result | Scenario |
|-----------|--------|----------|
| `false \|\| true` | `true` | Stale localStorage `showAddress: false`, DB has `show_address: true` → DB value wins |
| `false \|\| false` | `false` | User toggled "Online Business" ON within session, DB also has `false` → preserved |
| `undefined \|\| true` | `true` | localStorage key missing entirely → DB value wins |
| `true \|\| true` | `true` | Both agree on `true` → no change |
| `undefined \|\| false` | `false` | localStorage key missing, DB has `false` → preserved |

## Risk Assessment

**Low**. Single character change (`??` → `||`), well-understood JavaScript operator semantics. The `||` pattern is already used for every other field in the same merge block (lines 271-277, 280-284). This aligns `showAddress` with the existing convention.

## Testing Strategy

### Unit test
Add a test covering the sync function behavior:

| Test | Expected |
|------|----------|
| localStorage has `showAddress: false`, prev has `showAddress: true` | `showAddress` = `true` (DB value wins) |
| localStorage has `showAddress: false`, prev has `showAddress: false` | `showAddress` = `false` (within-session toggle preserved) |

### Which tests to run
```bash
npm test
```

### Regression scenarios to verify
1. Provider with address + `show_address: true` — open edit page with stale localStorage `showAddress: false` — save — DB still has `show_address: true` — overview shows address (not "Online")
2. Provider with address — toggle "Online Business" ON — save — `show_address: false` written to DB — overview shows "Online" (intentional)
3. Provider with address — toggle "Online Business" ON — navigate to sub-page — navigate back — `showAddress` remains `false` (within-session preservation)

## Prerequisites

- Analysis 187 is complete
- Branch `fix/187-showaddress-localstorage-bug` does not exist yet

## Steps

1. `git checkout main && git pull && git checkout -b fix/187-showaddress-localstorage-bug`
2. Edit `src/components/providers/ProviderEditForm.tsx` line 279: `??` → `||`
3. Run `npm test` to confirm no regressions
4. Commit with message: `fix: replace ?? with || for showAddress in syncFromLocalStorage`
5. Push and create PR
