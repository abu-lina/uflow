---
ID: 152
Origin: 152-instagram-field-bugfix-plan
Status: Implemented
---

# Implementation: Instagram field not accepting input (Plan 152)

## Changes Made

### Change 1 — `src/components/providers/ProviderEditForm.tsx:251-263`
Replaced `??` (nullish coalescing) with `||` for all 11 string fields in the `syncFromLocalStorage` inline restore block. Boolean fields (`isOnlineBusiness`, `showAddress`) kept `??`.

**Rationale**: `""` is not nullish, so `"" ?? prev.value` evaluates to `""`, overwriting DB values / user input with stale empty strings from localStorage. `||` falls through for `""`, `null`, and `undefined`.

### Change 2 — `src/components/providers/ProviderEditForm.tsx:301-319`
Removed the `window.focus` event listener. Removed `handleFocus` function. Reused `handleVisibility` for `pageshow`.

**Rationale**: `visibilitychange` already covers tab/window switch return. `pageshow` covers bfcache navigation. `focus` was redundant and actively harmful — it re-synced stale localStorage while the user was typing.

### Change 3 — `src/__tests__/components/ProviderEditForm.regression.test.tsx`
Added `describe('ProviderEditForm inline localStorage (Plan 152)')` block with 5 tests:
1. `stale empty string in localStorage does NOT overwrite DB value` — localStorage `instagram: ""` + DB `@realhandle` → shows `@realhandle`
2. `non-empty localStorage value restores on mount` — localStorage `@saved` + DB `@dbvalue` → shows `@saved`
3. `null in localStorage falls through to DB value` — localStorage `null` + DB `@dbvalue` → shows `@dbvalue`
4. `typing survives after sync with stale empty string` — type "testhandle", then `window.focus` → still shows "testhandle"
5. `empty string in localStorage does not overwrite phone field` — localStorage `phone: ""` + DB `+49123456789` → shows `+49123456789`

## Verification

- `npm test` — all 16 regression tests pass (11 existing + 5 new)
- `npm run type-check` — no errors
