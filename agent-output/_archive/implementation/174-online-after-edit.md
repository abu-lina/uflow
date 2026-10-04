---
ID: 174
Status: Active
---

# Implementation: Fix online-after-edit bug (Plan 174)

## What changed

### File: `src/components/providers/ProviderEditForm.tsx`

**Change 1 — syncFromLocalStorage operator asymmetry (line 278)**
- `isOnlineBusiness` is now recomputed from merged address data instead of restoring the stored toggle value.
- Before: `parsed.isOnlineBusiness ?? prev.isOnlineBusiness`
- After: `!(parsed.city || prev.city) && !(parsed.zipCode || prev.zipCode)`
- This eliminates contradictory form state (isOnlineBusiness=true but city="Berlin").

**Change 2 — Owner path guard in handleSubmit (lines 430-434)**
- Address fields are only nulled when BOTH isOnlineBusiness is true AND the address field is genuinely empty.
- Before: `address_city: submitData.isOnlineBusiness ? null : (submitData.city || null)`
- After: `address_city: submitData.isOnlineBusiness && !submitData.city ? null : (submitData.city || null)`
- Same pattern applied to street, zip, country, and show_address.
- This prevents stale isOnlineBusiness from corrupting populated address data.

**Change 4 — Admin localStorage guard (defense in depth) (lines 286-289)**
- After the storedInline merge block, checks if localStorage's isOnlineBusiness contradicts populated address data and resets it.
- Uses `provider.address_city` / `provider.address_zip` as reference (not scoped `prev`).

### File: `src/lib/validations/adminSchemas.ts`

**Change 3 — Added showAddress to providerEditUpdateSchema (line 75)**
- Before: missing field — Zod stripped it silently via `.strip()` mode
- After: `showAddress: z.boolean().optional()`
- This lets the admin API actually update `show_address` through the RPC.

## Test evidence

### Test results

| Test suite | Tests | Result |
|---|---|---|
| `ProviderEditForm.regression.test.tsx` | 19 (3 new) | All pass |
| `adminSchemas.test.ts` | 13 (2 new) | All pass |
| `admin/providerEdit.test.ts` | 20 (2 new) | All pass |

### Type-check
`npx tsc --noEmit` — clean (no output).

### Lint
`npx next lint` — no new errors (4 pre-existing errors in unrelated files).

## TDD compliance table

| Test | File | Pre-fix | Post-fix |
|------|------|---------|----------|
| `syncFromLocalStorage recomputes isOnlineBusiness` | `ProviderEditForm.regression.test.tsx` | N/A (new test) | PASSES |
| `handleSubmit owner path preserves address_city when isOnlineBusiness contradicts city` | `ProviderEditForm.regression.test.tsx` | N/A (new test) | PASSES |
| `handleSubmit owner path nulls address when intentional online` | `ProviderEditForm.regression.test.tsx` | N/A (new test) | PASSES |
| `showAddress passes through Zod validation` | `adminSchemas.test.ts` | N/A (new test) | PASSES |
| `showAddress is optional` | `adminSchemas.test.ts` | N/A (new test) | PASSES |
| `buildBasicFieldsPayload includes showAddress` | `admin/providerEdit.test.ts` | N/A (new test) | PASSES |
| `buildBasicFieldsPayload includes showAddress set to true` | `admin/providerEdit.test.ts` | N/A (new test) | PASSES |
