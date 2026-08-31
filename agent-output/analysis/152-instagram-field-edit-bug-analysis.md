---
ID: 152
Origin: 152
Status: Active
---

# Analysis: Instagram field not accepting input on provider edit page

## Value Statement & Objective

Identify the root cause of the Instagram text input on the admin provider edit form failing to accept keyboard input, while structurally identical fields (website, email, phone) work correctly.

## Context

- **Bug**: Instagram field on `dashboard/providers/<id>/edit` does not respond to typing/pasting
- **Environment**: UAT (admin context)
- **Form**: `ProviderEditForm` (1090 lines, `src/components/providers/ProviderEditForm.tsx`)
- **Deployment**: Admin page at `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`
- **Potentially related**: Plan 149 (images field fix), Plan 145 (admin provider fetch with extension tables)

## Methodology

- Static code analysis (read 8 source files across components, pages, API routes, services, types, tests)
- Control flow tracing (initialization → render → user input → state update → re-sync)
- Comparison with working fields (website, email, phone)
- Confidence levels: Proven / Observed / Inferred

## Findings

### Finding 1 (Proven — code structure)

**The input element itself is correct and identical in structure to working fields.**

Instagram input at `ProviderEditForm.tsx:803-809`:
- `type="text"`, no `readOnly`, no `disabled`
- Controlled with `value={formData.instagram}` and `onChange={(e) => handleInputChange('instagram', e.target.value)}`
- Uses the same `handleInputChange` (line 359-364) as all other fields
- Same CSS classes, no `pointer-events`, `z-index`, or overlay issues

### Finding 2 (Proven — code behavior)

**`syncFromLocalStorage` on mount can overwrite `instagram` with `""` from stale localStorage.**

At `ProviderEditForm.tsx:177-267`, `syncFromLocalStorage()` runs on mount (line 297-299, `useEffect` with `[syncFromLocalStorage]` dep).

- Key `admin_edit_inline_<pid>` read at line 245
- At line 261: `instagram: parsed.instagram ?? prev.instagram`
- If `parsed.instagram` is `""` (empty string, stored from a previous session where the field was blank when a sub-page was visited):
  - `"" ?? prev.instagram` evaluates to `""` (empty string is NOT nullish)
  - The DB value (e.g. `"@realhandle"`) is overwritten with `""`
- Same `??` pattern for ALL inline fields (website, email, phone, etc.)
- But Instagram is the field most likely to have been empty when `saveInlineDataToLocalStorage` was last called

### Finding 3 (Proven — code behavior)

**Re-sync effect (lines 301-319) can wipe out unsaved typing.**

The component registers three event listeners:
1. `window.addEventListener('focus', handleFocus)` — fires when browser tab gains focus
2. `document.addEventListener('visibilitychange', ...)` — fires when tab becomes visible
3. `window.addEventListener('pageshow', handleFocus)` — fires on history navigation

All three call `syncFromLocalStorage()`. If a user types in the Instagram field but `saveInlineDataToLocalStorage` has NOT been called (it's only called when navigating to a sub-page, not on every keystroke), a focus/visibility event reads the stale localStorage value and resets `instagram` to `""`.

Sequence:
1. Page loads → `syncFromLocalStorage` sets `instagram: ""` (from stale localStorage)
2. User types "abc" → `formData.instagram = "abc"` (correctly updates)
3. User switches to another tab then back → `window.focus` fires → `syncFromLocalStorage()` runs
4. localStorage still has `admin_edit_inline_<pid>` with `instagram: ""`
5. `formData.instagram` is reset to `""` → input is blank again

### Finding 4 (Proven — code behavior)

**`??` vs `||` distinction is critical.**

At line 261: `instagram: parsed.instagram ?? prev.instagram`

Contrast with what `||` would do: `"" || prev.instagram` → `prev.instagram` (falls through for empty string).

With `??`:
- `"" ?? prev.instagram` → `""` (empty string is NOT null, NOT undefined)
- `null ?? prev.instagram` → `prev.instagram`
- `undefined ?? prev.instagram` → `prev.instagram`

The `??` operator was likely chosen to avoid resetting fields to defaults when localStorage has `null`/`undefined`, but it has the side effect of propagating empty strings that overwrite DB values.

### Finding 5 (Proven — code behavior)

**`storedValues` spread (line 241) uses `...parsed`, not `??`, making it even more aggressive.**

```javascript
setFormData(prev => ({ ...prev, ...parsed }));
```

Any key in `admin_edit_values_<pid>` would completely replace the form field. Currently the values page only stores boolean fields (`muslimOwned`, `familyFriendly`, etc.), so `instagram` is not affected. But this pattern is a latent vector for similar bugs.

### Finding 6 (Observed — structural comparison)

**Why Instagram specifically and not website/email/phone?**

All four fields use the identical `??` pattern in `syncFromLocalStorage`. The difference is:

- `website`, `email`, `phone` are more likely to be non-empty in both the DB AND stored localStorage (because admins/providers tend to fill those in on sub-page visits)
- `instagram` is optional and often empty in the DB. If it was empty the first time `saveInlineDataToLocalStorage` was called, `""` was stored in `admin_edit_inline_<pid>`. Every subsequent `syncFromLocalStorage` restores `""`, even if the DB later acquired a value.

This creates a persistent **stale-localStorage lock** on the Instagram field.

### Finding 7 (Inferred — no reproduction performed)

**The bug is self-perpetuating until localStorage is cleared.**

Once `admin_edit_inline_<pid>` contains `instagram: ""`:

1. Every page load → `syncFromLocalStorage` sets Instagram to `""` ✓
2. User types and submits → Instagram saves to DB ✓
3. Next page load → `syncFromLocalStorage` sets it back to `""` ✗
4. Even if user types and navigates to sub-page → `saveInlineDataToLocalStorage` saves the typed value
5. RETURN from sub-page → `syncFromLocalStorage` reads the SAVED value → correct restoration
6. But DO THIS AGAIN in a NEW session → localStorage persists → step 1 applies

To definitively prove: set `localStorage.setItem('admin_edit_inline_<pid>', JSON.stringify({instagram: ''}))`, load the edit page, verify Instagram is blank even if DB has a value, then type and verify it works, then trigger `window.focus()` and observe it reset to `""`.

### Finding 8 (Proven — test coverage gap)

**No regression tests exist for the Instagram field or the inline re-sync of Instagram.**

Test files examined:
- `src/__tests__/components/ProviderEditForm.regression.test.tsx` — tests description, admin submit, listingType, category localStorage. NO tests for Instagram field.
- `src/__tests__/components/ProviderEditFormHideSocialInitiatives.test.tsx` — only tests the hideSocialInitiatives prop. NO tests for Instagram.

The inline localStorage re-sync tests (lines 410-491) only cover `categoryId` (`admin_edit_category_<pid>`), not the `admin_edit_inline_<pid>` key.

## Affected Files

| File | Relevance |
|------|-----------|
| `src/components/providers/ProviderEditForm.tsx` | 🔴 **Primary** — lines 176-267 (syncFromLocalStorage), 245-266 (inline re-sync with `??`), 261 (Instagram-specific line), 301-319 (re-sync effect) |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | 🟡 Admin page that mounts ProviderEditForm with `enableLocalStorage={true}, localStoragePrefix="admin_"` |
| `src/__tests__/components/ProviderEditForm.regression.test.tsx` | 🟢 Missing coverage for Instagram field inline re-sync |
| `src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx` | 🟢 Latent vector — `{ ...prev, ...parsed }` pattern could affect any field |
| `src/lib/validations/adminSchemas.ts` | 🟢 Schema is correct (`socialInstagram: z.string().max(200).nullable().optional()`) |
| `src/services/providers.ts` | 🟢 Type is correct (`social_instagram: string \| null`) |
| `src/types/adminProvider.ts` | 🟢 Type is correct (`social_instagram: string \| null`) |

## Root Cause

The `syncFromLocalStorage` re-sync mechanism in `ProviderEditForm` treats empty strings as valid values (via `??` nullish coalescing) when restoring inline fields from localStorage (`admin_edit_inline_<pid>`). A stale localStorage entry containing `instagram: ""` — created the first time a sub-page was visited while the Instagram field was empty — perpetually overwrites both the DB value on page load and any unsaved user input on window focus/visibility change.

**Confidence: Inferred (Level 3)** — code analysis confirms the mechanism exists and would produce the described behavior under specific localStorage conditions. Needs reproduction to upgrade to Level 1.

## Reproduction Steps

1. Visit `dashboard/providers/<any-provider>/edit` as admin
2. Ensure localStorage has `admin_edit_inline_<pid>` with `"instagram": ""`:
   ```javascript
   localStorage.setItem('admin_edit_inline_<pid>', JSON.stringify({instagram: ''}))
   ```
3. Reload the page
4. Observe the Instagram field is blank (even if DB has a value)
5. Type "testhandle" in the Instagram field — it should show "testhandle"
6. Switch to another browser tab and switch back (triggers `window.focus`)
7. Observe the Instagram field is blank again — typed value was wiped out

To confirm the fix target: repeat without the localStorage key set (clear it first) — the field should work normally.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does the UAT provider `a87989a7-2653-41ba-948e-88b96c44d00a` specifically have a stale `admin_edit_inline_*` in localStorage? | No access to UAT admin browser | Ask reporter to check `localStorage` in browser DevTools > Application > Local Storage | QA/Reporter |
| 2 | Does `social_instagram` have a value in the DB for this provider? | No direct DB access | Check via Supabase dashboard or API response | QA/Dev |
| 3 | Does the owner flow (profile edit) have the same bug? | Uses the same `ProviderEditForm` component | Test with owner localStorage prefix (no prefix) | Tester |
| 4 | Do other empty-string inline fields (website, email, phone) also get overwritten but go unnoticed? | Same mechanism applies | Test with a provider that has empty website but Instagram filled | Tester |

## Recommendations

1. **Fix the root cause**: Change `??` to checks that exclude empty strings, e.g.:
   - `(parsed.instagram ?? prev.instagram)` → `(parsed.instagram !== undefined && parsed.instagram !== null ? parsed.instagram : prev.instagram)`
   - OR use `||` instead of `??` for string fields (intentional: empty string → fall through to prev)
   
2. **Fix the re-sync-on-focus issue**: Consider whether `syncFromLocalStorage` should run on every window focus. It's needed for sub-page returns, but the `visibilitychange` handler already covers that. The `window.focus` listener may be redundant and harmful.

3. **Add regression tests**: Cover the Instagram input rendering, typing, and localStorage re-sync behavior. Include tests for the `??` vs `||` distinction with empty strings.

4. **Clear stale localStorage**: On mount, consider invalidating localStorage entries. Or at minimum, audit whether `admin_edit_inline_<pid>` from a prior session should be trusted.
