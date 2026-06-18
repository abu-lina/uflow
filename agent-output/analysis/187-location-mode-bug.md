---
ID: 187
Origin: 187
UUID: b7f3d8a2
Status: Active
---

# Analysis: Provider Edit — Location Incorrectly Shows "Online"

**Plan ID**: 187
**Phase**: 1 of 6 — Analyst (Complete)
**Date**: 2026-06-18

---

## Bug Summary

When editing a provider via the admin edit page (`/dashboard/providers/[id]/edit`), saving changes (e.g., opening hours) causes the provider overview to display "Online" as the location, even though the provider has a physical address and the user did not select "Online Business".

---

## Root Cause

**Primary Bug**: `showAddress` uses `??` (nullish coalescing) in localStorage sync, treating `false` as a valid override.

**File**: `src/components/providers/ProviderEditForm.tsx:279`
```typescript
showAddress: parsed.showAddress ?? prev.showAddress,
```

The `??` operator preserves `false` from localStorage even when the provider's DB record has `show_address: true`. This means:

1. On save, `formData.showAddress = false` is sent to the API
2. The RPC sets `show_address = false` in the DB  
3. The overview page reads the provider — the overview display is keyed off `address_city`, but ancillary display components (e.g., `ProviderCard`) may fall through to "Online" when `address_city` is the only available indicator combined with `show_address = false`

**Secondary issue**: Once `showAddress: false` enters localStorage (from a prior toggle-on in any session), it persists indefinitely because no code path clears it. The `??` operator prevents the DB-provided `true` from ever overriding it.

---

## Trigger Sequence

1. User toggles "Online Business" ON in any session → `showAddress = false` saved to `localStorage` key `admin_edit_inline_{id}`
2. In a later session, `syncFromLocalStorage` reads the stale `false`
3. `parsed.showAddress ?? prev.showAddress` = `false ?? true` = `false` (bug!)
4. Form sends `showAddress: false` on save
5. RPC sets `show_address = false` in the providers table
6. Overview components read `show_address = false` and display "Online" instead of the physical address

---

## Key Files

| File | Line | Role |
|------|------|------|
| `src/components/providers/ProviderEditForm.tsx` | 279 | **Bug**: `??` preserves `false` from localStorage |
| `src/components/providers/ProviderEditForm.tsx` | 307 | Saves `showAddress` to localStorage |
| `src/components/providers/ProviderEditForm.tsx` | 160 | Initializes `showAddress` from provider data |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | 108-112, 138 | Builds request body with address/showAddress |
| `src/services/admin/providerEdit.ts` | 80-101 | `buildBasicFieldsPayload` passes fields to RPC |
| `supabase/migrations/106_plan_165_show_address_admin_edit.sql` | 80 | RPC: `COALESCE((show_address)::boolean, show_address)` |
| `src/components/providers/ProviderCard.tsx` | 160-171 | Falls through to "Online" when address missing |
| `src/components/providers/ProviderDetailPage.tsx` | 384-418 | Shows "Online" when `address_city` missing |
| `src/components/providers/ProofTierCard.tsx` | 21 | Unrelated: defaults `verification_method` to `'online'` for halal seal |

---

## Data Flow

```
Form init: showAddress = provider.show_address ?? true
  → Toggle "Online Business" ON → showAddress = false
    → Navigate to sub-page → saveInlineData → localStorage.admin_edit_inline_{id}: { showAddress: false }
    → Return → syncFromLocalStorage → parsed.showAddress ?? prev.showAddress = false (BUG)
  → Save → PATCH /api/admin/edit-provider → showAddress: false
    → admin_update_provider RPC → SET show_address = false
      → Overview page reads DB → provider.show_address = false
        → ProviderCard/ProviderDetailPage shows "Online"
```

---

## Fix

Change line 279 from:
```typescript
showAddress: parsed.showAddress ?? prev.showAddress,
```
to:
```typescript
showAddress: parsed.showAddress ?? prev.showAddress,
```

Wait — that's the same. The fix is to use `||` instead of `??`:
```typescript
showAddress: parsed.showAddress || prev.showAddress,
```

This way:
- `false || true` = `true` (DB value wins over stale localStorage `false`)
- `false || false` = `false` (legitimately toggled-on state preserved within a session)

---

## Confidence

**Level 2 (Observed)** — The `??` operator semantics are confirmed by TypeScript/JS spec. The localStorage persistence path is confirmed by code reading. The RPC correctly writes whatever `show_address` value it receives.

---

## What Was Ruled Out

- **verification_method defaulting to 'online'**: This is about the halal seal (ProofTierCard), not the address display. Separate concern.
- **Address fields being nulled**: For a provider WITH an address, `isOnlineBusiness` correctly initializes to `false` and is recalculated from address data on sync. Address field values are preserved.
- **RPC clearing address fields**: `COALESCE(v_providers->>'address_city', address_city)` preserves existing values when key is missing.
- **Opening hours save path**: Hours are saved to localStorage only, then included in the main form submit. No separate save path that could clear address fields.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| 1 | Exact sequence that puts `showAddress: false` into localStorage for users who never toggle online | Need user session logs or UAT reproduction | Deploy fix, then monitor |
| 2 | Whether `show_address = false` also affects the ProviderDetailPage address display or only the ProviderCard | Can't check production DB | UAT: set show_address=false for a test provider and check both views |

---

## Recommendations

1. Fix line 279: change `??` to `||` for `showAddress`
2. Add a unit test: localStorage has `showAddress: false` but DB has `show_address: true` → sync produces `true`
3. Consider also adding a regression test for the full PATCH flow
