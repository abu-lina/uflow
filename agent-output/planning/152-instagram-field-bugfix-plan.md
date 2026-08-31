---
ID: 152
Origin: 152
Status: Active
---

# Plan: Fix Instagram field not accepting input on provider edit page

## Summary

Replace the `??` (nullish coalescing) operator with `||` for all string-type fields in the inline localStorage restore block of `syncFromLocalStorage` (`ProviderEditForm.tsx:249-264`). Empty string `""` is not nullish, so `"" ?? prev.value` evaluates to `""`, overwriting DB/typed values with stale empty strings from localStorage. The fix makes empty strings fall through to `prev`. Also remove the `window.focus` re-sync listener (redundant with `visibilitychange`, and actively harmful — it re-syncs stale localStorage while the user is typing). Add regression tests covering the inline localStorage key, the `""` overwrite scenario, and focus re-sync behavior.

## Code Changes

### File: `src/components/providers/ProviderEditForm.tsx`

#### Change 1a — Fix `??` to `||` for all string fields in inline restore (line 251-263)

**Rationale**: `||` falls through for `""`, `null`, and `undefined`. Boolean fields (`isOnlineBusiness`, `showAddress`) keep `??` because `false` is valid and should not fall through.

**Before**:
```typescript
          providerName: parsed.providerName ?? prev.providerName,
          providerDescription: parsed.providerDescription ?? prev.providerDescription,
          listingType: parsed.listingType ?? prev.listingType,
          street: parsed.street ?? prev.street,
          zipCode: parsed.zipCode ?? prev.zipCode,
          city: parsed.city ?? prev.city,
          country: parsed.country ?? prev.country,
          isOnlineBusiness: parsed.isOnlineBusiness ?? prev.isOnlineBusiness,
          showAddress: parsed.showAddress ?? prev.showAddress,
          website: parsed.website ?? prev.website,
          instagram: parsed.instagram ?? prev.instagram,
          email: parsed.email ?? prev.email,
          phone: parsed.phone ?? prev.phone,
```

**After**:
```typescript
          providerName: parsed.providerName ?? prev.providerName,
          providerDescription: parsed.providerDescription ?? prev.providerDescription,
          listingType: parsed.listingType ?? prev.listingType,
          street: parsed.street ?? prev.street,
          zipCode: parsed.zipCode ?? prev.zipCode,
          city: parsed.city ?? prev.city,
          country: parsed.country ?? prev.country,
          isOnlineBusiness: parsed.isOnlineBusiness ?? prev.isOnlineBusiness,
          showAddress: parsed.showAddress ?? prev.showAddress,
          website: parsed.website ?? prev.website,
          instagram: parsed.instagram || prev.instagram,
          email: parsed.email ?? prev.email,
          phone: parsed.phone ?? prev.phone,
```

Wait — that only fixes Instagram. Apply `||` to **all** string fields (not booleans). See `src/components/providers/ProviderEditForm.tsx:251-263`.

**Correct After**:
```typescript
          providerName: parsed.providerName || prev.providerName,
          providerDescription: parsed.providerDescription || prev.providerDescription,
          listingType: parsed.listingType || prev.listingType,
          street: parsed.street || prev.street,
          zipCode: parsed.zipCode || prev.zipCode,
          city: parsed.city || prev.city,
          country: parsed.country || prev.country,
          isOnlineBusiness: parsed.isOnlineBusiness ?? prev.isOnlineBusiness,
          showAddress: parsed.showAddress ?? prev.showAddress,
          website: parsed.website || prev.website,
          instagram: parsed.instagram || prev.instagram,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
```

`??` kept on `isOnlineBusiness`, `showAddress` (booleans where `false` must not fall through).

#### Change 1b — Remove `window.focus` re-sync listener (lines 309, 312, 316)

**Rationale**: `visibilitychange` already covers tab-switch and window-switch returns. `pageshow` covers bfcache restores from history navigation. `focus` is redundant and actively harmful — it re-syncs stale localStorage over the user's in-progress typing.

**Before**:
```typescript
    const handleFocus = () => syncFromLocalStorage();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
    };
```

**After**:
```typescript
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
```

(Reuses `handleVisibility` since both events need the same `syncFromLocalStorage()` call.)

### File: `src/__tests__/components/ProviderEditForm.regression.test.tsx`

Add new `describe('ProviderEditForm inline localStorage (Plan 152)')` block after line 491.

## Test Strategy

Add a new `describe` block with the following test cases:

| # | Test | Scenario | Pre-fix | Post-fix |
|---|------|----------|---------|----------|
| 1 | `stale empty string in localStorage does NOT overwrite DB value` | localStorage `admin_edit_inline_<pid>` has `instagram: ""`, DB value is `"@realhandle"`. On mount, Instagram field should show `"@realhandle"`. | FAILS — shows `""` | PASSES |
| 2 | `non-empty localStorage value DOES restore on mount` | localStorage has `instagram: "@saved"`, DB value is `"@dbvalue"`. On mount, Instagram field should show `"@saved"`. | PASSES | PASSES |
| 3 | `null in localStorage falls through to DB value` | localStorage has `instagram: null`, DB value is `"@dbvalue"`. On mount, shows `"@dbvalue"`. | PASSES (`null ?? prev`) | PASSES (`null || prev`) |
| 4 | `typing survives window.focus re-sync with stale empty string` | Set localStorage `instagram: ""`, render, type "abc", dispatch `window.focus`, verify Instagram input still shows "abc". | FAILS — reset to `""` | PASSES — `"" \|\| prev` keeps typed value |
| 5 | `empty string in localStorage does not overwrite other string fields` | Same pattern for `website`, `email`, `phone` — verify each field preserves DB value on mount | FAILS (all) | PASSES (all) |

**Mock strategy**:
- For tests 1-3, mock `localStorage.getItem` to return controlled JSON for `admin_edit_inline_<pid>` before rendering.
- For test 4, render normally, then fire `window.focus` and verify the input value.
- Provider object passed to `ProviderEditForm` should have non-empty `social_instagram`, `social_website`, `contact_email`, `contact_phone` values.

## Risk Assessment

### Fields affected by the `??` → `||` change (low risk)

All 11 string fields in the inline restore block (`providerName`, `providerDescription`, `listingType`, `street`, `zipCode`, `city`, `country`, `website`, `instagram`, `email`, `phone`). The change makes empty string fall through to `prev`. This is strictly more conservative — it restores less aggressively than before. No field that was working correctly with `??` will break with `||` for strings.

### Boolean fields (no risk)

`isOnlineBusiness` and `showAddress` keep `??`. `false || prev.value` would incorrectly fall through to `prev`; `false ?? prev.value` correctly stays `false`.

### `storedValues` spread (latent vector, out of scope)

Line 241: `setFormData(prev => ({ ...prev, ...parsed }))` for key `admin_edit_values_<pid>`. Currently stores only boolean/menu-type values. If a future change stores string fields in this key, the same overwrite bug could surface. Flagged for awareness only — not part of this fix.

### `window.focus` removal (low risk)

`visibilitychange` is the standard modern API for detecting tab visibility changes. All supported browsers fire it. The `pageshow` event handles bfcache navigation (back/forward). Removing `focus` eliminates the primary vector for typing-wipe regression testing proves.

## Edge Cases

| Edge Case | Behavior with fix | Correct? |
|-----------|-------------------|----------|
| User intentionally leaves Instagram blank and saves | DB gets `null`/`""`. On next load, `""` falls through to `prev.instagram` (empty). Shows blank. | Yes |
| User clears a field to `""`, navigates to sub-page, returns | `saveInlineDataToLocalStorage` saves `""`. On return, `syncFromLocalStorage` runs. `""` falls through to `prev` (which is `""` from the save). Field stays blank. | Yes |
| Owner profile edit path (no prefix) | Same component, same fix. Keys are `edit_inline_<pid>` instead of `admin_edit_inline_<pid>`. No separate change needed. | Yes |
| Both `storedValues` and `storedInline` have conflicting Instagram values | `storedValues` spread (`...parsed`, line 241) runs first, then `storedInline` restore (line 249-264). Inline restore wins. | Yes (last write wins) |
| User has multiple providers, each with their own localStorage | Keys are scoped by `pid`. Fix applies uniformly. | Yes |
| Mobile browser — `visibilitychange` may fire differently | Still fires when browser tab becomes active. `pageshow` covers Safari bfcache. | Low risk, covered by existing patterns |
